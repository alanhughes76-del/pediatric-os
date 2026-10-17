import { Redirect, Stack } from 'expo-router';
import { useApp } from '@/data/store';
import { encabezado } from '@/components/navegacion';
import { Marco } from '@/components/escritorio/Marco';
import { colors } from '@/theme';

export default function FamiliaLayout() {
  const { sesion } = useApp();
  if (sesion?.rol !== 'familia') return <Redirect href="/" />;

  return (
    <Marco rol="familia">
      <Stack screenOptions={{ ...encabezado, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="hijo/[id]" options={{ title: 'Ficha' }} />
        <Stack.Screen name="urgencia" options={{ title: 'Consulta por urgencia' }} />
        <Stack.Screen name="fiebre/[id]" options={{ title: 'Fiebre' }} />
        <Stack.Screen name="fiebre/nuevo" options={{ title: 'Anotar', presentation: 'modal' }} />
      </Stack>
    </Marco>
  );
}
