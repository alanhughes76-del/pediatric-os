/** Aviso flotante cuando algo no se pudo guardar (por ejemplo, sin conexión o sin permiso). */
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { Texto } from './Texto';
import { colors, sombra } from '@/theme';

export function AvisoDeError() {
  const { error, limpiarError, sesion } = useApp();
  if (!error || !sesion) return null;
  return (
    <View style={s.envoltura} pointerEvents="box-none">
      <View style={s.aviso} accessibilityRole="alert">
        <Ionicons name="alert-circle" size={22} color={colors.alert} />
        <Texto style={{ flex: 1 }} color={colors.alert}>{error}</Texto>
        <Pressable onPress={limpiarError} accessibilityRole="button" accessibilityLabel="Cerrar el aviso" hitSlop={10} style={s.cerrar}>
          <Ionicons name="close" size={22} color={colors.alert} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  envoltura: { position: 'absolute', left: 0, right: 0, bottom: 90, alignItems: 'center', paddingHorizontal: 16 },
  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 560, width: '100%', padding: 14, borderRadius: 14,
    backgroundColor: colors.alertBg, borderWidth: 1, borderColor: colors.alertBorder, boxShadow: sombra,
  },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
