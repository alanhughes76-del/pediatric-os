import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

/** Estilo común de encabezados y pestañas. */
export const encabezado = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.primary },
  headerBackTitle: 'Volver',
} as const;

/** La pestaña activa, ícono y texto, va dentro de una píldora azul noche (Stitch). */
export const pestanas = {
  ...encabezado,
  tabBarActiveTintColor: colors.white,
  tabBarActiveBackgroundColor: colors.accion,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarItemStyle: { borderRadius: 999, overflow: 'hidden', marginHorizontal: 2, marginBottom: 8 },
  tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12 },
} as const;

const ALTO_BARRA = 70;

/** Barra inferior: el alto suma la franja segura del teléfono, para que la píldora entre completa. */
export function useBarraPestanas() {
  const { bottom } = useSafeAreaInsets();
  return {
    backgroundColor: colors.bg, borderTopWidth: 0, paddingTop: 8, paddingHorizontal: 2,
    height: ALTO_BARRA + bottom, boxShadow: '0px -8px 24px rgba(30, 58, 82, 0.05)',
  };
}

type NombreIcono = keyof typeof Ionicons.glyphMap;

export const iconoPestana = (nombre: NombreIcono) =>
  function IconoPestana({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nombre} color={typeof color === 'string' ? color : undefined} size={size - 2} />;
  };
