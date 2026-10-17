import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme';

/** Estilo común de encabezados y pestañas. */
export const encabezado = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.primary },
  headerBackTitle: 'Volver',
} as const;

export const pestanas = {
  ...encabezado,
  tabBarActiveTintColor: colors.accion,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 68, paddingTop: 6 },
  tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 13 },
} as const;

type NombreIcono = keyof typeof Ionicons.glyphMap;

/** Ícono para una pestaña. */
export const iconoPestana = (nombre: NombreIcono) =>
  function IconoPestana({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nombre} color={typeof color === "string" ? color : undefined} size={size} />;
  };
