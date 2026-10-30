/** Tarjeta azul noche con círculos finos de adorno: lo más importante de cada bloque (próxima visita, último informe). */
import type { ReactNode } from 'react';
import { Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, size, sombraNoche } from '@/theme';

export function TarjetaNoche({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    // La sombra va por fuera: `overflow: hidden` la recortaría en el teléfono.
    <View style={[s.sombra, style]}>
      <View style={s.tarjeta}>
        <View style={s.adorno} pointerEvents="none" aria-hidden>
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

/** Etiqueta chica sobre la tarjeta azul noche. */
export function ChipNoche({ texto, icono }: { texto: string; icono?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.chip}>
      {icono ? <Ionicons name={icono} size={14} color={colors.bgSoft} /> : null}
      <Text style={s.chipTexto}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.nocheSuave },
  chipTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.bgSoft },
  sombra: { borderRadius: size.radiusGrande, boxShadow: sombraNoche },
  tarjeta: { flexGrow: 1, gap: 8, padding: 24, borderRadius: size.radiusGrande, backgroundColor: colors.accion, overflow: 'hidden' },
  adorno: { position: 'absolute', top: -36, right: -36, width: 176, height: 176, opacity: 0.15 },
});
