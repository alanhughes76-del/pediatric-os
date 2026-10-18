/**
 * Ingreso del equipo con Firebase (email y contraseña). Si la cuenta tiene segundo factor, después
 * de la contraseña pide el código de 6 números de la app de autenticación.
 * Las familias entran con el enlace por email (ingresar.tsx).
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/data/store';
import { Pantalla } from './Pantalla';
import { Tarjeta } from './Tarjeta';
import { Campo } from './Formulario';
import { Boton } from './Boton';
import { router } from 'expo-router';
import { ErrorComprensible } from './Estados';
import { Subtitulo, Texto, TextoChico } from './Texto';
import { colors, fonts } from '@/theme';

export function IngresoEquipo() {
  const { ingresar, error, limpiarError, segundoFactorPendiente, confirmarSegundoFactor, cancelarSegundoFactor } = useApp();
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  const entrar = async () => {
    if (!email.trim() || !clave) return setFalla('Escribí tu email y tu contraseña.');
    setEnviando(true);
    limpiarError();
    setFalla(await ingresar(email, clave));
    setEnviando(false);
  };

  const confirmar = async () => {
    setEnviando(true);
    setFalla(await confirmarSegundoFactor(codigo));
    setEnviando(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pantalla>
        <View style={s.marca} accessible accessibilityLabel="Pediatric OS, Cuidando hoy su mañana">
          <Text style={s.nombre}>Pediatric OS</Text>
          <Text style={s.bajada}>Cuidando hoy su mañana</Text>
        </View>
        {segundoFactorPendiente ? (
          <Tarjeta style={{ gap: 14 }}>
            <Subtitulo>Código de seguridad</Subtitulo>
            <Texto>Abrí la app de autenticación y escribí el código de 6 números de Pediatric OS.</Texto>
            <Campo etiqueta="Código" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" autoComplete="one-time-code" maxLength={7} onSubmitEditing={confirmar} />
            {falla ? <ErrorComprensible texto={falla} /> : null}
            <Boton titulo={enviando ? 'Verificando…' : 'Entrar'} icono="shield-checkmark-outline" deshabilitado={enviando} onPress={confirmar} />
            <Boton titulo="Volver" variante="contorno" onPress={() => { cancelarSegundoFactor(); setCodigo(''); setFalla(null); }} />
          </Tarjeta>
        ) : (
        <Tarjeta style={{ gap: 14 }}>
          <Subtitulo>Ingresar</Subtitulo>
          <Campo etiqueta="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="nombre@ejemplo.com" />
          <Campo etiqueta="Contraseña" value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" onSubmitEditing={entrar} />
          {falla || error ? <ErrorComprensible texto={(falla || error)!} /> : null}
          <Boton titulo={enviando ? 'Ingresando…' : 'Ingresar'} icono="log-in-outline" deshabilitado={enviando} onPress={entrar} />
        </Tarjeta>
        )}
        <TextoChico>
          Conectado a los emuladores de Firebase en esta computadora: solo hay datos de demostración. El usuario de prueba
          del médico y su contraseña están en scripts/sembrar.ts.
        </TextoChico>
        <Tarjeta style={{ gap: 10 }}>
          <Subtitulo>¿Sos de una familia?</Subtitulo>
          <Texto>Entrás con un enlace que te llega por email, sin contraseña.</Texto>
          <Boton titulo="Entrar con mi email" icono="mail-outline" variante="secundario" onPress={() => router.push('/ingresar')} />
        </Tarjeta>
      </Pantalla>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  marca: { alignItems: 'center', paddingVertical: 24 },
  nombre: { fontFamily: fonts.title, fontSize: 34, color: colors.primary, letterSpacing: -0.5 },
  bajada: { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted, marginTop: 4 },
});
