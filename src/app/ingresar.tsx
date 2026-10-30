/**
 * Ingreso de las familias con enlace mágico por email (prompt maestro 4).
 * - "Enviame el enlace": la respuesta es la misma exista o no el email (no revela quién está cargado).
 * - El enlace del mail abre esta pantalla con `?token=…` y entra solo.
 * - En la demostración y en el emulador no hay mails: el enlace se muestra en pantalla para probar.
 */
import { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/data/store';
import { VALIDEZ_MINUTOS } from '@/lib/enlaceMagico';
import { Pantalla } from '@/components/Pantalla';
import { Marca } from '@/components/Marca';
import { Emblema } from '@/components/Emblema';
import { Papelito } from '@/components/Papelito';
import { Saludo } from '@/components/Saludo';
import { TituloEditorial } from '@/components/TituloEditorial';
import { Campo, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { Antetitulo, Texto, TextoChico } from '@/components/Texto';
import { Etiqueta } from '@/components/Etiqueta';
import { Cargando } from '@/components/Estados';
import { categorias, colors, fonts, size } from '@/theme';

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
        <View style={s.arriba}>
          <View style={s.pildora}>
            <View style={s.punto} />
            <Text style={s.pildoraTexto}>Pediatría integral a domicilio</Text>
          </View>
          <Papelito texto="Atención en tu hogar" manuscrito giro={2} />
        </View>

        <View style={s.marca}>
          <Emblema />
          <Marca grande centrada />
          <Text style={s.frase}>Pequeños pacientes, grandes historias</Text>
        </View>

        <View style={s.bienvenida}>
          <Saludo />
          <TituloEditorial texto="Tu" destacado="portal de familia" ondulada centrado />
          <Texto style={{ textAlign: 'center' }} color={colors.textMuted}>Te mandamos un enlace para entrar, sin contraseña.</Texto>
        </View>

        <Tarjeta style={{ gap: 12 }}>
          <Antetitulo>Correo electrónico</Antetitulo>
          <Campo
            accessibilityLabel="Correo electrónico"
            icono="mail-outline"
            style={{ backgroundColor: colors.bg }}
            value={email}
            onChangeText={(v) => { setEmail(v); setEnviado(false); setPrueba(null); setError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="nombre@ejemplo.com"
          />
          <Boton titulo={enviando ? 'Enviando…' : 'Enviame el enlace'} iconoFinal="arrow-forward" deshabilitado={enviando || !email.trim()} onPress={() => void pedir()} />
          <View style={s.seguro}>
            <Ionicons name="shield-checkmark-outline" size={18} color={categorias.verde.acento} />
            <TextoChico style={{ flex: 1 }}>Acceso seguro sin contraseña. El enlace vale {VALIDEZ_MINUTOS} minutos.</TextoChico>
          </View>
        </Tarjeta>

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

        <TextoChico style={{ textAlign: 'center' }}>Acceso solo para adultos responsables invitados por el Dr. Hughes.</TextoChico>
        <View style={s.ayuda}>
          <Ionicons name="chatbubbles-outline" size={24} color={categorias.verde.acento} />
          <Texto style={{ flex: 1 }} color={categorias.verde.texto}>¿Cambiaste de mail o tenés dudas? Escribime directamente por PacienteX.</Texto>
        </View>
        <Boton titulo="Volver" variante="contorno" onPress={() => router.replace('/')} />
      </Pantalla>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  arriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: categorias.verde.fondo },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: categorias.verde.acento },
  pildoraTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: categorias.verde.texto },
  marca: { alignItems: 'center', gap: 10, paddingTop: 8 },
  frase: { fontFamily: fonts.hand, fontSize: 22, color: colors.primary2, textAlign: 'center' },
  bienvenida: { alignItems: 'center', gap: 6, paddingVertical: 4 },
  seguro: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ayuda: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: size.radiusGrande, backgroundColor: categorias.verde.fondo },
});
