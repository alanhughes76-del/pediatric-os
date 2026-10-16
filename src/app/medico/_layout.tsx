import { Redirect, Stack } from 'expo-router';
import { useApp } from '@/data/store';
import { encabezado } from '@/components/navegacion';
import { colors } from '@/theme';

export default function MedicoLayout() {
  const { sesion } = useApp();
  if (sesion?.rol !== 'medico') return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ ...encabezado, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="hijo/[id]" options={{ title: 'Ficha' }} />
      <Stack.Screen name="familia/[id]" options={{ title: 'Familia' }} />
      <Stack.Screen name="consulta/[id]" options={{ title: 'Consulta' }} />
      <Stack.Screen name="seguimiento/[id]" options={{ title: 'Seguimiento' }} />
      <Stack.Screen name="fiebre/[id]" options={{ title: 'Fiebre' }} />
      <Stack.Screen name="fiebre/nuevo" options={{ title: 'Registro a mano', presentation: 'modal' }} />
    </Stack>
  );
}
