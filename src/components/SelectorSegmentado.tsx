/**
 * Elegir una sola opción dentro de una píldora (Día · Semana · Mes, el hijo activo).
 * `oscuro`: la activa en azul noche; `claro`: en blanco. Si las opciones no entran, bajan de renglón.
 */
import type { ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { anilloFoco, colors, fonts, sombra } from '@/theme';

export interface OpcionSegmentada<T extends string> {
  valor: T;
  texto: string;
  detalle?: string;
  /** Por ejemplo, las iniciales del chico. */
  adorno?: ReactNode;
}

export function SelectorSegmentado<T extends string>({ opciones, valor, onCambio, etiqueta, tono = 'oscuro', anchoMinimo = 90 }: {
  opciones: OpcionSegmentada<T>[];
  valor?: T;
  onCambio: (v: T) => void;
  /** Para el lector de pantalla. */
  etiqueta: string;
  tono?: 'oscuro' | 'claro';
  anchoMinimo?: number;
}) {
  return (
    <View style={s.selector} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      {opciones.map((o) => {
        const activa = o.valor === valor;
        const oscura = activa && tono === 'oscuro';
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambio(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa, checked: activa }}
            accessibilityLabel={o.detalle ? `${o.texto}. ${o.detalle}` : o.texto}
            style={(estado) => [
              s.opcion,
              { flexBasis: anchoMinimo },
              activa && (oscura ? s.activaOscura : s.activaClara),
              (estado as { focused?: boolean }).focused && anilloFoco,
            ]}
          >
            {o.adorno}
            <View style={{ flexShrink: 1 }}>
              <Text style={[s.texto, activa && s.textoActivo, oscura && { color: colors.white }]} numberOfLines={1}>{o.texto}</Text>
              {o.detalle ? <Text style={[s.detalle, oscura && { color: colors.bgSoft }]} numberOfLines={2}>{o.detalle}</Text> : null}
            </View>
            {activa && tono === 'claro' ? <Ionicons name="checkmark-circle" size={20} color={colors.primary2} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 5, borderRadius: 28, backgroundColor: colors.muted },
  opcion: {
    flexGrow: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  activaOscura: { backgroundColor: colors.accion },
  activaClara: { backgroundColor: colors.white, boxShadow: sombra },
  texto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textMuted },
  textoActivo: { fontFamily: fonts.bodyBold, color: colors.primary },
  detalle: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
