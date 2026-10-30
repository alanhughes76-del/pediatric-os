import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, categorias, type Categoria } from '@/theme';

type Tono = 'azul' | 'celeste' | 'alerta' | 'neutro' | Exclude<Categoria, 'celeste'>;

const tonos: Record<Tono, { bg: string; fg: string }> = {
  azul: { bg: colors.accion, fg: colors.white },
  celeste: { bg: colors.bgSoft, fg: categorias.celeste.texto },
  alerta: { bg: colors.alertBg, fg: colors.alert },
  neutro: { bg: colors.muted, fg: colors.textMuted },
  verde: { bg: categorias.verde.fondo, fg: categorias.verde.texto },
  violeta: { bg: categorias.violeta.fondo, fg: categorias.violeta.texto },
  naranja: { bg: categorias.naranja.fondo, fg: categorias.naranja.texto },
  rosado: { bg: categorias.rosado.fondo, fg: categorias.rosado.texto },
};

export function Etiqueta({ texto, tono = 'celeste' }: { texto: string; tono?: Tono }) {
  const t = tonos[tono];
  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      {tono === 'alerta' ? <Ionicons name="warning" size={14} color={t.fg} /> : null}
      <Text style={[s.texto, { color: t.fg }]}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  texto: { fontFamily: fonts.bodyBold, fontSize: 13.5 },
});
