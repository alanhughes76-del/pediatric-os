/**
 * Ingreso de las familias con enlace mágico por email (prompt maestro 4).
 * - "Enviame el enlace": la respuesta es la misma exista o no el email (no revela quién está cargado).
 * - El enlace del mail abre esta pantalla con `?token=…` y entra solo.
 * - En la demostración y en el emulador no hay mails: el enlace se muestra en pantalla para probar.
 */
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/data/store';
import { VALIDEZ_MINUTOS } from '@/lib/enlaceMagico';
import { Pantalla } from '@/components/Pantalla';
import { Marca } from '@/components/Marca';
import { Campo, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { Subtitulo, Texto, TextoChico } from '@/components/Texto';
import { Etiqueta } from '@/components/Etiqueta';
import { Cargando } from '@/components/Estados';
import { colors } from '@/theme';

/** El enlace de prueba puede ser una dirección completa (Firebase) o solo el código (demostración). */
const codigoDe = (enlace: string) => {
  const m = enlace.match(/[?&]token=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : enlace;
};

export default function Ingresar() {
  const { pedirEnlaceEmail, entrarConEnlace } = useApp();
  const { token: tokenDelMail } = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [entrando, setEntrando] = useState(!!tokenDelMail);
  const [prueba, setPrueba] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const usado = useRef(false);

  const entrar = async (codigo: string) => {
    setEntrando(true);
    setError(null);
    const e = await entrarConEnlace(codigo);
    if (e) { setEntrando(false); setError(e); return; }
    router.replace('/familia');
  };

  // Llegó desde el enlace del mail: entra solo (una sola vez).
  useEffect(() => {
    if (tokenDelMail && !usado.current) {
      usado.current = true;
      void entrar(tokenDelMail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenDelMail]);

  const pedir = async () => {
    setEnviando(true);
    setError(null);
    const r = await pedirEnlaceEmail(email);
    setEnviando(false);
    if (r.error) return setError(r.error);
    setEnviado(true);
    setPrueba(r.enlaceDePrueba ?? null);
  };

  if (entrando) return <Cargando texto="Entrando…" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pantalla>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}><Marca grande /></View>
        <Subtitulo>Entrá con tu email</Subtitulo>
        <Texto>Te mandamos un enlace para entrar, sin contraseña.</Texto>
        <Campo
          etiqueta="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); setEnviado(false); setPrueba(null); setError(null); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="nombre@ejemplo.com"
        />
        <Boton titulo={enviando ? 'Enviando…' : 'Enviame el enlace'} icono="mail-outline" deshabilitado={enviando || !email.trim()} onPress={() => void pedir()} />

        {enviado ? (
          <Aviso texto={`Si tu email está habilitado, te mandamos un enlace para entrar. Vale ${VALIDEZ_MINUTOS} minutos y se usa una sola vez.`} />
        ) : null}

        {enviado && prueba ? (
          <Tarjeta style={{ gap: 10 }}>
            <Etiqueta texto="Modo prueba" tono="azul" />
            <TextoChico>En la demostración no se envían mails: este botón hace lo mismo que el enlace del mail.</TextoChico>
            <Boton titulo="Abrir el enlace" variante="secundario" onPress={() => void entrar(codigoDe(prueba))} />
          </Tarjeta>
        ) : null}
        {error ? <Aviso tono="alerta" texto={error} /> : null}

        <Boton titulo="Volver" variante="contorno" onPress={() => router.replace('/')} />
        <TextoChico>Nadie se registra solo: el Dr. habilita a cada adulto. Si no podés entrar, escribile al Dr. por PacienteX.</TextoChico>
      </Pantalla>
    </SafeAreaView>
  );
}
