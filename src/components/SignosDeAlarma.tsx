import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Texto, TextoFuerte } from './Texto';
import { BotonPacienteX } from './BotonPacienteX';
import { colors, size } from '@/theme';

export const SIGNOS_DE_ALARMA = [
  'Tiene menos de 3 meses y fiebre de 38 °C o más.',
  'Está muy decaído, dormido o cuesta despertarlo, incluso estando sin fiebre.',
  'Respira con dificultad o muy rápido.',
  'Tiene convulsiones, rigidez de cuello o manchas violáceas que no desaparecen al estirar la piel.',
  'Vomita todo lo que toma o hace muchas horas que no orina.',
];

/** Aviso de signos de alarma, con el contacto por PacienteX y el SAME 107. */
export function SignosDeAlarma() {
  return (
    <View style={s.caja} accessibilityRole="alert">
      <View style={s.fila}>
        <Ionicons name="alert-circle" size={28} color={colors.alert} />
        <TextoFuerte color={colors.alert} style={{ fontSize: size.large, flex: 1 }}>Consultá de inmediato si tu hijo:</TextoFuerte>
      </View>
      <View style={{ gap: 8 }}>
        {SIGNOS_DE_ALARMA.map((t) => (
          <View key={t} style={s.item}>
            <Texto color={colors.alert} style={s.vineta}>•</Texto>
            <Texto style={{ flex: 1, fontSize: 19, lineHeight: 27 }}>{t}</Texto>
          </View>
        ))}
      </View>
      <BotonPacienteX />
      <TextoFuerte color={colors.alert} style={{ textAlign: 'center' }}>En una emergencia, llamá al SAME 107.</TextoFuerte>
    </View>
  );
}

const s = StyleSheet.create({
  caja: {
    backgroundColor: colors.alertBg,
    borderColor: colors.alertBorder,
    borderWidth: 1.5,
    borderRadius: size.radiusGrande,
    padding: 20,
    gap: 14,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { flexDirection: 'row', gap: 8 },
  vineta: { fontSize: 19, lineHeight: 27 },
});
