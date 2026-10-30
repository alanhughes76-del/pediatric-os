import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { anilloFoco, colors, fonts, size } from '@/theme';

type Variante = 'principal' | 'secundario' | 'contorno' | 'alerta' | 'contacto';

interface P {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: keyof typeof Ionicons.glyphMap;
  /** Ícono después del texto, por ejemplo una flecha. */
  iconoFinal?: keyof typeof Ionicons.glyphMap;
  detalle?: string;
  deshabilitado?: boolean;
  /** Menos relleno y letra un poco más chica, para botones lado a lado. */
  compacto?: boolean;
}

const estilos: Record<Variante, { bg: string; fg: string; border: string }> = {
  principal: { bg: colors.accion, fg: colors.white, border: colors.accion },
  secundario: { bg: colors.accionSuave, fg: colors.accionTexto, border: colors.accionSuave },
  contorno: { bg: colors.white, fg: colors.accion, border: colors.input },
  alerta: { bg: colors.alert, fg: colors.white, border: colors.alert },
  contacto: { bg: colors.contacto, fg: colors.white, border: colors.contacto },
};

export function Boton({ titulo, onPress, variante = 'principal', icono, iconoFinal, detalle, deshabilitado, compacto }: P) {
  const e = estilos[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      // `focused` existe en la web (react-native-web): anillo de foco visible al navegar con teclado.
      style={(estado) => [
        s.base,
        compacto && s.compacto,
        { backgroundColor: e.bg, borderColor: e.border, opacity: deshabilitado ? 0.5 : estado.pressed ? 0.85 : 1 },
        (estado as { focused?: boolean }).focused && anilloFoco,
      ]}
    >
      {icono ? <Ionicons name={icono} size={compacto ? 22 : 26} color={e.fg} /> : null}
      <View style={{ flexShrink: 1 }}>
        <Text style={[s.texto, compacto && s.textoCompacto, { color: e.fg }]} numberOfLines={compacto ? 1 : undefined}>{titulo}</Text>
        {detalle ? <Text style={[s.detalle, { color: e.fg }]}>{detalle}</Text> : null}
      </View>
      {iconoFinal ? <Ionicons name={iconoFinal} size={20} color={variante === 'principal' ? colors.sage : e.fg} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: size.touch,
    // Píldora, como en la app de Lovable.
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 24,
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
