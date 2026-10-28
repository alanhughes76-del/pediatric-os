/**
 * Dos manchas suaves de color detrás del contenido (celeste arriba a la derecha, verde agua a la
 * izquierda), como en la app de Lovable. Decorativo: no recibe toques ni lo lee el lector de pantalla.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme';

function Mancha({ id, color, estilo }: { id: string; color: string; estilo: object }) {
  return (
    <Svg style={[s.mancha, estilo]} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="0.65" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
}

export function FondoManchas() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Mancha id="mancha-celeste" color={colors.sky} estilo={{ right: -160, top: -190 }} />
      <Mancha id="mancha-verde" color={colors.sage} estilo={{ left: -190, top: '35%' }} />
    </View>
  );
}

const s = StyleSheet.create({
  mancha: { position: 'absolute', width: 520, height: 520 },
});
