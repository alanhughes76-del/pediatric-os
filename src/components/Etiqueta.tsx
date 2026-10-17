import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, categorias, type Categoria } from '@/theme';

type Tono = 'azul' | 'celeste' | 'alerta' | 'neutro' | Exclude<Categoria, 'celeste'>;

const tonos: Record<Tono, { bg: string; fg: string }> = {
  azul: { bg: colors.primary, fg: colors.white },
  celeste: { bg: colors.bgSoft, fg: colors.primary },
  alerta: { bg: colors.alertBg, fg: colors.alert },
  neutro: { bg: '#EEF2F5', fg: colors.textMuted },
  verdeAgua: { bg: categorias.verdeAgua.fondo, fg: categorias.verdeAgua.texto },
  lavanda: { bg: categorias.lavanda.fondo, fg: categorias.lavanda.texto },
  durazno: { bg: categorias.durazno.fondo, fg: categorias.durazno.texto },
  arena: { bg: categorias.arena.fondo, fg: categorias.arena.texto },
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
