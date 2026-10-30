/** Tarjeta azul noche con círculos finos de adorno: lo más importante de la pantalla, una por pantalla. */
import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, size, sombraNoche } from '@/theme';

export function TarjetaNoche({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    // La sombra va por fuera: `overflow: hidden` la recortaría en el teléfono.
    <View style={[s.sombra, style]}>
      <View style={s.tarjeta}>
        <View style={s.adorno} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="46" stroke={colors.white} strokeWidth={1.2} strokeDasharray="4 3" fill="none" />
            <Circle cx="50" cy="50" r="32" stroke={colors.white} strokeWidth={0.8} fill="none" />
          </Svg>
        </View>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sombra: { borderRadius: size.radiusGrande, boxShadow: sombraNoche },
  tarjeta: { flexGrow: 1, gap: 8, padding: 24, borderRadius: size.radiusGrande, backgroundColor: colors.accion, overflow: 'hidden' },
  adorno: { position: 'absolute', top: -36, right: -36, width: 176, height: 176, opacity: 0.15 },
});
