import { View, Pressable, StyleSheet, type ViewProps } from 'react-native';
import { colors, size, sombra } from '@/theme';

type P = ViewProps & { onPress?: () => void; accessibilityLabel?: string };

export function Tarjeta({ style, onPress, children, ...p }: P) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.card, pressed && s.pressed, style as object]} {...p}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]} {...p}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: size.radiusGrande,
    // Sin borde a la vista (Stitch). Queda transparente para las tarjetas que marcan el suyo (formularios abiertos).
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 20,
    boxShadow: sombra,
  },
  pressed: { backgroundColor: colors.bgSoft },
});
