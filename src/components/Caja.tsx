/**
 * Tarjeta de tablero: ícono de color de categoría, título, contenido y un enlace al pie.
 * Va dentro de una `Grilla`: en pantalla ancha quedan varias por fila; en el teléfono, una.
 * `ancha` ocupa la fila entera (por ejemplo, el gráfico de crecimiento).
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tarjeta } from './Tarjeta';
import { Subtitulo } from './Texto';
import { BotonTexto } from './ficha/piezas';
import { categorias, colors, type Categoria } from '@/theme';

type NombreIcono = keyof typeof Ionicons.glyphMap;

export function Caja({ titulo, icono, color, ver, children, ancha }: {
  titulo: string;
  icono: NombreIcono;
  color: Categoria;
  ver?: { texto: string; onPress: () => void };
  children: ReactNode;
  ancha?: boolean;
}) {
  const c = categorias[color];
  return (
    <Tarjeta style={[s.caja, ancha && { flexBasis: '100%' }]}>
      <View style={s.cabecera}>
        <View style={[s.icono, { backgroundColor: c.fondo }]}><Ionicons name={icono} size={20} color={c.acento} /></View>
        <Subtitulo style={s.titulo}>{titulo}</Subtitulo>
      </View>
      <View style={{ gap: 10, flex: 1 }}>{children}</View>
      {ver ? <View style={s.pie}><BotonTexto texto={ver.texto} onPress={ver.onPress} /></View> : null}
    </Tarjeta>
  );
}

export function Grilla({ children }: { children: ReactNode }) {
  return <View style={s.grilla}>{children}</View>;
}

const s = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  caja: { flexGrow: 1, flexBasis: 320, minWidth: 0, gap: 14 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icono: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 21 },
  pie: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
});
