import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

type Tono = 'azul' | 'celeste' | 'alerta' | 'neutro';

const tonos: Record<Tono, { bg: string; fg: string }> = {
  azul: { bg: colors.primary, fg: colors.white },
  celeste: { bg: colors.bgSoft, fg: colors.primary },
  alerta: { bg: colors.alertBg, fg: colors.alert },
  neutro: { bg: '#EEF2F5', fg: colors.textMuted },
};

export function Etiqueta({ texto, tono = 'celeste' }: { texto: string; tono?: Tono }) {
  const t = tonos[tono];
  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <Text style={[s.texto, { color: t.fg }]}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  texto: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
