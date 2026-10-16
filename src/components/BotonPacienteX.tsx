import { Linking, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from './Boton';
import { CONFIG } from '@/config';
import { colors } from '@/theme';

/** Abre PacienteX en el navegador del teléfono (fuera de la app). */
export function abrirPacienteX() {
  Linking.openURL(CONFIG.pacienteXUrl);
}

export function BotonPacienteX() {
  return <Boton titulo="Contactá al Dr. por PacienteX" icono="chatbubbles-outline" onPress={abrirPacienteX} />;
}

/** Barra fija al pie de las pantallas de la familia: el contacto directo siempre a mano. */
export function BarraPacienteX({ conInsetInferior = false }: { conInsetInferior?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.barra, conInsetInferior && { paddingBottom: 12 + insets.bottom }]}>
      <BotonPacienteX />
    </View>
  );
}

const s = StyleSheet.create({
  barra: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
