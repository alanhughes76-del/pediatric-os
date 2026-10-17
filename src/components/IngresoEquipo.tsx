/**
 * Ingreso del equipo con Firebase (email y contraseña). El segundo factor (TOTP) se activa
 * cuando exista el proyecto real; en los emuladores no aplica.
 * El portal de las familias (enlace por email) se conecta en la Etapa 6.
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
  const { ingresar, error, limpiarError } = useApp();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pantalla>
        <View style={s.marca} accessible accessibilityLabel="Pediatric OS, Cuidando hoy su mañana">
          <Text style={s.nombre}>Pediatric OS</Text>
          <Text style={s.bajada}>Cuidando hoy su mañana</Text>
        </View>
        <Tarjeta style={{ gap: 14 }}>
          <Subtitulo>Ingresar</Subtitulo>
          <Campo etiqueta="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="nombre@ejemplo.com" />
          <Campo etiqueta="Contraseña" value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" onSubmitEditing={entrar} />
          {falla || error ? <ErrorComprensible texto={(falla || error)!} /> : null}
          <Boton titulo={enviando ? 'Ingresando…' : 'Ingresar'} icono="log-in-outline" deshabilitado={enviando} onPress={entrar} />
        </Tarjeta>
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
