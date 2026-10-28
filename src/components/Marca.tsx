import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

/** Logotipo tipográfico: "Dr. Alan Hughes - Pediatría Integral" (la marca de las dos caras de la app). */
export function Marca({ grande = false, claro = false, centrada = false }: { grande?: boolean; claro?: boolean; centrada?: boolean }) {
  const c = claro ? colors.white : colors.primary;
  return (
    <View accessible accessibilityLabel="Dr. Alan Hughes, Pediatría Integral" style={centrada && { alignItems: 'center' }}>
      <Text style={[s.nombre, { color: c, fontSize: grande ? 34 : 22 }]}>Dr. Alan Hughes</Text>
      <Text style={[s.bajada, { color: claro ? colors.sidebarTexto : colors.textMuted, fontSize: grande ? 14 : 12 }]}>
        PEDIATRÍA INTEGRAL
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  nombre: { fontFamily: fonts.title, letterSpacing: -0.5 },
  bajada: { fontFamily: fonts.bodySemi, letterSpacing: 2, marginTop: 2 },
});
