/**
 * Círculo con las iniciales del paciente (no hay fotos) y el color de su ámbito.
 * El mismo color se usa en la etiqueta del ámbito.
 */
import { View, Text, StyleSheet } from 'react-native';
import type { Patient, Scope } from '@/data/types';
import { categorias, fonts, type Categoria } from '@/theme';

export const TONO_AMBITO: Record<Scope, Categoria> = {
  membresia: 'celeste',
  cardales: 'verdeAgua',
  hepta: 'lavanda',
  esporadico: 'durazno',
  'sin-asignar': 'arena',
};

export function Avatar({ paciente: p, tamano = 48 }: { paciente: Pick<Patient, 'firstName' | 'lastName' | 'scope'>; tamano?: number }) {
  const c = categorias[TONO_AMBITO[p.scope]];
  return (
    <View
      style={[s.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: c.fondo }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
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
