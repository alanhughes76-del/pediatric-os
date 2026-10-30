/**
 * Título del diseño de Stitch: liviano, con una parte en negrita azul y, si hace falta, la línea
 * ondulada celeste debajo. Por ejemplo: "Tu **portal de familia**".
 */
import { Text, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, size } from '@/theme';

/** Decorativa: el lector de pantalla no la lee. */
export function LineaOndulada({ ancho = 96 }: { ancho?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={ancho} height={8} viewBox="0 0 100 8" preserveAspectRatio="none">
        <Path d="M1 4C12 1 18 7 30 4C42 1 48 7 60 4C72 1 78 7 90 4C94 3 97 3.5 99 4" stroke={colors.sky} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

export function TituloEditorial({ texto, destacado, ondulada, centrado }: {
  texto: string;
  destacado: string;
  ondulada?: boolean;
  centrado?: boolean;
}) {
  return (
    <View style={[s.bloque, centrado && { alignItems: 'center' }]}>
      <Text accessibilityRole="header" style={[s.liviano, centrado && { textAlign: 'center' }]}>
        {texto} <Text style={s.fuerte}>{destacado}</Text>
      </Text>
      {ondulada ? <LineaOndulada /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  bloque: { gap: 4 },
  liviano: { fontFamily: fonts.titleLight, fontSize: size.h1, lineHeight: 36, letterSpacing: -0.5, color: colors.primary },
  fuerte: { fontFamily: fonts.title, color: colors.primary2 },
});
