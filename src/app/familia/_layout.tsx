import { Redirect, Stack } from 'expo-router';
import { useApp } from '@/data/store';
import { encabezado } from '@/components/navegacion';
import { Marco } from '@/components/escritorio/Marco';
import { Cargando } from '@/components/Estados';
import { colors } from '@/theme';

export default function FamiliaLayout() {
  const { sesion, listo } = useApp();
  // En Firebase la sesión se resuelve al arrancar: mientras tanto no se redirige.
  if (!listo) return <Cargando texto="Abriendo…" />;
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
