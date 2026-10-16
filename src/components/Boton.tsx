import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, size } from '@/theme';

type Variante = 'principal' | 'secundario' | 'contorno' | 'alerta' | 'contacto';

interface P {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: keyof typeof Ionicons.glyphMap;
  detalle?: string;
  deshabilitado?: boolean;
  /** Menos relleno y letra un poco más chica, para botones lado a lado. */
  compacto?: boolean;
}

const estilos: Record<Variante, { bg: string; fg: string; border: string }> = {
  principal: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secundario: { bg: colors.bgSoft, fg: colors.primary, border: colors.bgSoft },
  contorno: { bg: colors.white, fg: colors.primary, border: colors.primary3 },
  alerta: { bg: colors.alert, fg: colors.white, border: colors.alert },
  contacto: { bg: colors.contacto, fg: colors.white, border: colors.contacto },
};

export function Boton({ titulo, onPress, variante = 'principal', icono, detalle, deshabilitado, compacto }: P) {
  const e = estilos[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      style={({ pressed }) => [
        s.base,
        compacto && s.compacto,
        { backgroundColor: e.bg, borderColor: e.border, opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {icono ? <Ionicons name={icono} size={compacto ? 22 : 26} color={e.fg} /> : null}
      <View style={{ flexShrink: 1 }}>
        <Text style={[s.texto, compacto && s.textoCompacto, { color: e.fg }]} numberOfLines={compacto ? 1 : undefined}>{titulo}</Text>
        {detalle ? <Text style={[s.detalle, { color: e.fg }]}>{detalle}</Text> : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: size.touch,
    borderRadius: size.radius,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  compacto: { paddingHorizontal: 10, gap: 8 },
  textoCompacto: { fontSize: size.base },
  texto: { fontFamily: fonts.bodyBold, fontSize: size.large, textAlign: 'center' },
  detalle: { fontFamily: fonts.body, fontSize: size.small, textAlign: 'center', opacity: 0.9 },
});
