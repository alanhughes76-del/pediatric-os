import { Tabs } from 'expo-router';
import { pestanas, iconoPestana as icono } from '@/components/navegacion';
import { CambiarRol } from '@/components/CambiarRol';
import { useEscritorio } from '@/components/escritorio/Marco';
import { Marca } from '@/components/Marca';

export default function FamiliaTabs() {
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
      <Tabs.Screen name="index" options={{ title: 'Inicio', headerTitle: escritorio ? undefined : () => <Marca />, tabBarIcon: icono('home-outline') }} />
      <Tabs.Screen name="pedir" options={{ title: 'Pedir visita', tabBarIcon: icono('calendar-outline') }} />
      <Tabs.Screen name="fiebre" options={{ title: 'Fiebre', tabBarIcon: icono('thermometer-outline') }} />
      <Tabs.Screen name="membresia" options={{ title: 'Mis datos', tabBarIcon: icono('person-outline') }} />
    </Tabs>
  );
}
