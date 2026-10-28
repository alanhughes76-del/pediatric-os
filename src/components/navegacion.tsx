import { View, type ColorValue } from 'react-native';
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
  tabBarActiveBackgroundColor: 'transparent',
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 72, paddingTop: 8 },
  tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
} as const;

type NombreIcono = keyof typeof Ionicons.glyphMap;

/** Ícono para una pestaña: la activa va dentro de una píldora azul noche (como en la app de Lovable). */
export const iconoPestana = (nombre: NombreIcono) =>
  function IconoPestana({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return (
      <View
        style={{
          width: 52, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
          backgroundColor: focused ? colors.accion : 'transparent',
        }}
      >
        <Ionicons name={nombre} color={focused ? colors.white : typeof color === 'string' ? color : undefined} size={size - 2} />
      </View>
    );
  };
