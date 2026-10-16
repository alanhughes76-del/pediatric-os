import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Allergy } from '@/data/types';
import { Texto, TextoFuerte, TextoChico } from './Texto';
import { colors, size } from '@/theme';

/**
 * Alergias: las confirmadas siempre visibles y destacadas (rojo = alerta).
 * Las referidas solo las ve el médico (la lista que llega ya viene filtrada por vista).
 */
export function AlergiasDestacadas({ alergias }: { alergias: Allergy[] }) {
  const confirmadas = alergias.filter((a) => a.status === 'confirmada');
  const referidas = alergias.filter((a) => a.status === 'referida');

  if (confirmadas.length === 0 && referidas.length === 0) {
    return (
      <View style={s.fila}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary2} />
        <Texto>Sin alergias confirmadas</Texto>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {confirmadas.length > 0 ? (
        <View style={s.caja} accessibilityRole="alert">
          <View style={s.fila}>
            <Ionicons name="warning" size={24} color={colors.alert} />
            <TextoFuerte color={colors.alert} style={{ fontSize: size.large }}>
              {confirmadas.length === 1 ? 'Alergia confirmada' : 'Alergias confirmadas'}
            </TextoFuerte>
          </View>
          {confirmadas.map((a) => (
            <Texto key={a.id} color={colors.alert}>
              <TextoFuerte color={colors.alert}>{a.allergen}</TextoFuerte>
              {a.reaction ? ` · ${a.reaction}` : ''} · {a.severity}
            </Texto>
          ))}
        </View>
      ) : null}
      {referidas.map((a) => (
        <View key={a.id} style={s.fila}>
          <Ionicons name="help-circle-outline" size={22} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Texto>{a.allergen}{a.reaction ? ` · ${a.reaction}` : ''}</Texto>
            <TextoChico>Referida · {a.severity} · la familia no la ve</TextoChico>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { backgroundColor: colors.alertBg, borderColor: colors.alertBorder, borderWidth: 1.5, borderRadius: size.radius, padding: 16, gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
});
