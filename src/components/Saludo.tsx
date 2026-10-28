import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

/** Frase corta en letra manuscrita (Caveat), como en la app de Lovable. Nunca para datos. */
export function Saludo({ texto = 'Hola, qué bueno verte', izquierda }: { texto?: string; izquierda?: boolean }) {
  return <Text style={[s.saludo, izquierda && { textAlign: 'left' }]}>{texto}</Text>;
}

const s = StyleSheet.create({
  saludo: { fontFamily: fonts.hand, fontSize: 30, color: colors.primary2, textAlign: 'center' },
});
