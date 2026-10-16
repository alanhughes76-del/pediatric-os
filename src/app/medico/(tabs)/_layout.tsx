import { Tabs } from 'expo-router';
import { pestanas, iconoPestana as icono } from '@/components/navegacion';
import { CambiarRol } from '@/components/CambiarRol';


export default function MedicoTabs() {
  return (
    <Tabs screenOptions={{ ...pestanas, headerRight: () => <CambiarRol /> }}>
      <Tabs.Screen name="index" options={{ title: 'Hoy', tabBarIcon: icono('today-outline') }} />
      <Tabs.Screen name="familias" options={{ title: 'Familias', tabBarIcon: icono('people-outline') }} />
      <Tabs.Screen name="fiebre" options={{ title: 'Fiebre', tabBarIcon: icono('thermometer-outline') }} />
      <Tabs.Screen name="membresias" options={{ title: 'Membresías', tabBarIcon: icono('wallet-outline') }} />
    </Tabs>
  );
}
