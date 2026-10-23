import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

/** Logotipo tipográfico: "Dr. Alan Hughes - Pediatría Integral". */
export function Marca({ grande = false, claro = false }: { grande?: boolean; claro?: boolean }) {
  const c = claro ? colors.white : colors.primary;
  return (
    <View accessible accessibilityLabel="Dr. Alan Hughes, Pediatría Integral">
      <Text style={[s.nombre, { color: c, fontSize: grande ? 34 : 22 }]}>Dr. Alan Hughes</Text>
      <Text style={[s.bajada, { color: claro ? colors.bgSoft : colors.primary3, fontSize: grande ? 17 : 14 }]}>
        PEDIATRÍA INTEGRAL
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  nombre: { fontFamily: fonts.title },
  bajada: { fontFamily: fonts.bodySemi, letterSpacing: 2, marginTop: 2 },
});
