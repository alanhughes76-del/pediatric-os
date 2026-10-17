import { Tabs } from 'expo-router';
import { pestanas, iconoPestana as icono } from '@/components/navegacion';
import { CambiarRol } from '@/components/CambiarRol';
import { useEscritorio } from '@/components/escritorio/Marco';

export default function MedicoTabs() {
  // En pantallas anchas la navegación está en la barra lateral.
  const escritorio = useEscritorio();
  return (
    <Tabs
      screenOptions={{
        ...pestanas,
        headerRight: escritorio ? undefined : () => <CambiarRol />,
        tabBarStyle: escritorio ? { display: 'none' } : pestanas.tabBarStyle,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy', tabBarIcon: icono('today-outline') }} />
      <Tabs.Screen name="pacientes" options={{ title: 'Pacientes', tabBarIcon: icono('people-outline') }} />
      <Tabs.Screen name="fiebre" options={{ title: 'Fiebre', tabBarIcon: icono('thermometer-outline') }} />
      <Tabs.Screen name="membresias" options={{ title: 'Membresías', tabBarIcon: icono('wallet-outline') }} />
    </Tabs>
  );
}
