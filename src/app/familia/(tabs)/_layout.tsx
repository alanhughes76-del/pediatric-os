import { Tabs } from 'expo-router';
import { pestanas, iconoPestana as icono } from '@/components/navegacion';
import { CambiarRol } from '@/components/CambiarRol';
import { Marca } from '@/components/Marca';


export default function FamiliaTabs() {
  return (
    <Tabs screenOptions={{ ...pestanas, headerRight: () => <CambiarRol /> }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', headerTitle: () => <Marca />, tabBarIcon: icono('home-outline') }} />
      <Tabs.Screen name="pedir" options={{ title: 'Pedir visita', tabBarIcon: icono('calendar-outline') }} />
      <Tabs.Screen name="fiebre" options={{ title: 'Fiebre', tabBarIcon: icono('thermometer-outline') }} />
      <Tabs.Screen name="membresia" options={{ title: 'Membresía', tabBarIcon: icono('document-text-outline') }} />
    </Tabs>
  );
}
