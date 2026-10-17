import { Redirect, Stack } from 'expo-router';
import { useApp } from '@/data/store';
import { encabezado } from '@/components/navegacion';
import { Marco } from '@/components/escritorio/Marco';
import { colors } from '@/theme';

export default function MedicoLayout() {
  const { sesion } = useApp();
  if (sesion?.rol !== 'medico') return <Redirect href="/" />;

  return (
    <Marco rol="medico">
      <Stack screenOptions={{ ...encabezado, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="hijo/[id]" options={{ title: 'Ficha' }} />
        <Stack.Screen name="familia/[id]" options={{ title: 'Familia' }} />
        <Stack.Screen name="paciente/nuevo" options={{ title: 'Nuevo paciente' }} />
        <Stack.Screen name="adulto/[id]" options={{ title: 'Adulto' }} />
        <Stack.Screen name="adulto/vincular" options={{ title: 'Agregar adulto' }} />
        <Stack.Screen name="accesos" options={{ title: 'Registro de accesos' }} />
        <Stack.Screen name="certificado/nuevo" options={{ title: 'Certificado' }} />
        <Stack.Screen name="consulta/[id]" options={{ title: 'Consulta' }} />
        <Stack.Screen name="seguimiento/[id]" options={{ title: 'Seguimiento' }} />
        <Stack.Screen name="fiebre/[id]" options={{ title: 'Fiebre' }} />
        <Stack.Screen name="fiebre/nuevo" options={{ title: 'Registro a mano', presentation: 'modal' }} />
      </Stack>
    </Marco>
  );
}
