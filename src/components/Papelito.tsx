import { Text, View, StyleSheet } from 'react-native';
import { colors, fonts, sombra } from '@/theme';

/** Etiqueta blanca levemente rotada, como un papelito pegado. Para un detalle cálido, nunca para datos. */
export function Papelito({ texto, manuscrito, giro = -2 }: { texto: string; manuscrito?: boolean; giro?: number }) {
  return (
    <View style={[s.papelito, { transform: [{ rotate: `${giro}deg` }] }]}>
      <Text style={manuscrito ? s.manuscrito : s.mayusculas}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  papelito: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, boxShadow: sombra },
  manuscrito: { fontFamily: fonts.hand, fontSize: 18, color: colors.primary },
  mayusculas: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.accionTexto },
});
