/** Emblema del ingreso: casita, corazón y estetoscopio en un círculo blanco con aro punteado. Decorativo. */
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, sombra } from '@/theme';

export function Emblema() {
  return (
    <View style={s.circulo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={s.aro} />
      <Svg width={44} height={44} viewBox="0 0 64 64" fill="none">
        <Path d="M12 28L32 12L52 28" stroke={colors.primary} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 25V46C17 48.2 18.8 50 21 50H43C45.2 50 47 48.2 47 46V25" stroke={colors.primary} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M43 16V22" stroke={colors.primary} strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M32 37.8C32 37.8 24 33 24 28C24 25.5 26 23.5 28.5 23.5C30 23.5 31.3 24.3 32 25.4C32.7 24.3 34 23.5 35.5 23.5C38 23.5 40 25.5 40 28C40 33 32 37.8 32 37.8Z" fill={colors.sageSoft} stroke={colors.foco} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M22 41C22 46 26.5 49 32 49C37.5 49 42 46 42 41" stroke={colors.sky} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={32} cy={49} r={3.2} fill={colors.foco} stroke={colors.primary} strokeWidth={1.8} />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  circulo: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, boxShadow: sombra },
  aro: { position: 'absolute', top: 4, right: 4, bottom: 4, left: 4, borderRadius: 36, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sky },
});
