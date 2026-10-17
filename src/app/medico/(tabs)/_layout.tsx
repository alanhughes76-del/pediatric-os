import { Tabs } from 'expo-router';
import { pestanas, iconoPestana as icono } from '@/components/navegacion';
import { useEscritorio } from '@/components/escritorio/Marco';
import { useApp } from '@/data/store';
import { avisosDelMedico } from '@/data/avisos';
import { colors } from '@/theme';

/**
 * Celular: barra inferior Inicio · Agenda · Pacientes · Avisos · Más (prompt maestro 5.3).
 * Pantalla ancha: la barra se oculta y se navega con la barra lateral.
 * "Fiebre" y "Membresías" siguen existiendo, sin pestaña: se llega desde Inicio, Avisos y Más.
 */
export default function MedicoTabs() {
  const escritorio = useEscritorio();
  const { db } = useApp();
  const avisos = avisosDelMedico(db).length;
  return (
    <Tabs
      screenOptions={{
        ...pestanas,
        tabBarStyle: escritorio ? { display: 'none' } : pestanas.tabBarStyle,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icono('home-outline') }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: icono('calendar-outline') }} />
      <Tabs.Screen name="pacientes" options={{ title: 'Pacientes', tabBarIcon: icono('people-outline') }} />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: icono('notifications-outline'),
          tabBarBadge: avisos > 0 ? avisos : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.alert, color: colors.white },
          tabBarAccessibilityLabel: avisos > 0 ? `Avisos, ${avisos} pendientes` : 'Avisos',
        }}
      />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: icono('menu-outline') }} />
      <Tabs.Screen name="fiebre" options={{ title: 'Registro de fiebre', href: null }} />
      <Tabs.Screen name="membresias" options={{ title: 'Membresías', href: null }} />
    </Tabs>
  );
}
