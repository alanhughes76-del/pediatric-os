/**
 * Círculo con las iniciales del paciente (no hay fotos) y el color de su ámbito.
 * El mismo color se usa en la etiqueta del ámbito.
 */
import { View, Text, StyleSheet } from 'react-native';
import type { Patient, Scope } from '@/data/types';
import { categorias, colors, fonts, type Categoria } from '@/theme';

export const TONO_AMBITO: Record<Scope, Categoria> = {
  membresia: 'celeste',
  cardales: 'verde',
  hepta: 'violeta',
  esporadico: 'naranja',
  'sin-asignar': 'rosado',
};

/** `sobreColor`: fondo blanco, para cuando va sobre una tarjeta ya pintada con el color del ámbito. */
export function Avatar({ paciente: p, tamano = 48, sobreColor }: { paciente: Pick<Patient, 'firstName' | 'lastName' | 'scope'>; tamano?: number; sobreColor?: boolean }) {
  const c = categorias[TONO_AMBITO[p.scope]];
  return (
    <View
      style={[s.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: sobreColor ? colors.white : c.fondo }]}
      aria-hidden
    >
      <Text style={[s.texto, { color: c.texto, fontSize: Math.round(tamano * 0.38) }]}>
        {`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  circulo: { alignItems: 'center', justifyContent: 'center' },
  texto: { fontFamily: fonts.title },
});
