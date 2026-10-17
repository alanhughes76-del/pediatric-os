import type { ReactNode } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { colors, size } from '@/theme';

interface P {
  children: ReactNode;
  /** Contenido fijo al pie (por ejemplo, el botón de PacienteX). */
  pie?: ReactNode;
  /** Columna ancha (tableros como la ficha del paciente). */
  ancho?: boolean;
}

export function Pantalla({ children, pie, ancho }: P) {
  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
        <View style={[s.columna, ancho && { maxWidth: 1180 }]}>{children}</View>
      </ScrollView>
      {pie}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  contenido: { padding: size.gutter, paddingBottom: 32 },
  // En tablet o web se limita el ancho para que siga leyéndose cómodo.
  columna: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
});
