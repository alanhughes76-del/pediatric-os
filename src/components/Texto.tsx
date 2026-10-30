import { Text, type TextProps, StyleSheet } from 'react-native';
import { colors, fonts, size } from '@/theme';

type P = TextProps & { color?: string };

export const Titulo = ({ style, color, ...p }: P) => <Text accessibilityRole="header" style={[s.h1, color ? { color } : null, style]} {...p} />;
export const Subtitulo = ({ style, color, ...p }: P) => <Text accessibilityRole="header" style={[s.h2, color ? { color } : null, style]} {...p} />;
export const Texto = ({ style, color, ...p }: P) => <Text style={[s.body, color ? { color } : null, style]} {...p} />;
export const TextoFuerte = ({ style, color, ...p }: P) => <Text style={[s.body, s.bold, color ? { color } : null, style]} {...p} />;
export const TextoChico = ({ style, color, ...p }: P) => <Text style={[s.small, color ? { color } : null, style]} {...p} />;
/** Etiqueta chica en mayúsculas espaciadas, arriba de un título. */
export const Antetitulo = ({ style, color, ...p }: P) => <Text style={[s.antetitulo, color ? { color } : null, style]} {...p} />;

const s = StyleSheet.create({
  h1: { fontFamily: fonts.title, fontSize: size.h1, color: colors.primary, lineHeight: size.h1 * 1.2 },
  h2: { fontFamily: fonts.titleSemi, fontSize: size.h2, color: colors.primary, lineHeight: size.h2 * 1.25 },
  body: { fontFamily: fonts.body, fontSize: size.base, color: colors.text, lineHeight: size.base * 1.4 },
  bold: { fontFamily: fonts.bodySemi },
  small: { fontFamily: fonts.body, fontSize: size.small, color: colors.textMuted, lineHeight: size.small * 1.4 },
  antetitulo: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.accionTexto },
});
