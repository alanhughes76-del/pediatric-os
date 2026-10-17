import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, categorias, type Categoria } from '@/theme';

type Tono = 'azul' | 'celeste' | 'alerta' | 'neutro' | Exclude<Categoria, 'celeste'>;

const tonos: Record<Tono, { bg: string; fg: string }> = {
  azul: { bg: colors.accion, fg: colors.white },
  celeste: { bg: colors.bgSoft, fg: colors.accionTexto },
  alerta: { bg: colors.alertBg, fg: colors.alert },
  neutro: { bg: '#EEF2F5', fg: colors.textMuted },
  verde: { bg: categorias.verde.fondo, fg: categorias.verde.texto },
  violeta: { bg: categorias.violeta.fondo, fg: categorias.violeta.texto },
  naranja: { bg: categorias.naranja.fondo, fg: categorias.naranja.texto },
  rosado: { bg: categorias.rosado.fondo, fg: categorias.rosado.texto },
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
