import { Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { colors, fonts } from '@/theme';

/** Solo para la etapa de prueba: vuelve al selector de rol. */
export function CambiarRol() {
  const { salir } = useApp();
  return (
    <Pressable
      onPress={() => { salir(); router.replace('/'); }}
      accessibilityRole="button"
      accessibilityLabel="Cambiar de rol (modo prueba)"
      style={s.pill}
      hitSlop={8}
    >
      <Text style={s.texto}>Cambiar rol</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: { borderWidth: 1, borderColor: colors.sky, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 12 },
  texto: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary2 },
});
