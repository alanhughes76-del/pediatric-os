/**
 * Ingreso de las familias con enlace mágico por email (simulado; ver lib/enlaceMagico.ts).
 * El mensaje es el mismo exista o no el email, para no revelar quién está cargado.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/data/store';
import { TEXTO_MOTIVO_ENLACE, VALIDEZ_MINUTOS } from '@/lib/enlaceMagico';
import { Pantalla } from '@/components/Pantalla';
import { Marca } from '@/components/Marca';
import { Campo, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { Subtitulo, Texto, TextoChico } from '@/components/Texto';
import { Etiqueta } from '@/components/Etiqueta';
import { colors } from '@/theme';

export default function Ingresar() {
  const { pedirEnlaceEmail, entrarConEnlace } = useApp();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          onChangeText={(v) => { setEmail(v); setEnviado(false); setToken(null); setError(null); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="nombre@ejemplo.com"
        />
        <Boton titulo="Enviame el enlace" icono="mail-outline" onPress={() => { setToken(pedirEnlaceEmail(email)); setEnviado(true); setError(null); }} />

        {enviado ? (
          <Aviso texto={`Si tu email está habilitado, te mandamos un enlace para entrar. Vale ${VALIDEZ_MINUTOS} minutos y se usa una sola vez.`} />
        ) : null}

        {enviado && token ? (
          <Tarjeta style={{ gap: 10 }}>
            <Etiqueta texto="Modo prueba" tono="azul" />
            <TextoChico>Así se vería el email. Todavía no se envían emails de verdad.</TextoChico>
            <Boton
              titulo="Abrir el enlace"
              variante="secundario"
              onPress={() => {
                const r = entrarConEnlace(token);
                if (r.ok) router.replace('/familia');
                else setError(TEXTO_MOTIVO_ENLACE[r.motivo]);
              }}
            />
          </Tarjeta>
        ) : null}
        {error ? <Aviso tono="alerta" texto={error} /> : null}

        <Boton titulo="Volver" variante="contorno" onPress={() => router.replace('/')} />
        <TextoChico>Nadie se registra solo: el Dr. habilita a cada adulto. Si no podés entrar, contactá al Dr.</TextoChico>
      </Pantalla>
    </SafeAreaView>
  );
}
