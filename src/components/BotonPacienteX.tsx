import { Linking, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from './Boton';
import { useApp } from '@/data/store';
import { colors } from '@/theme';

/** Abre PacienteX en el navegador del teléfono (fuera de la app). El link se carga en Configuración. */
export function BotonPacienteX() {
  const { db } = useApp();
  return <Boton titulo="Escribime por PacienteX" icono="chatbubbles-outline" variante="contacto" onPress={() => { void Linking.openURL(db.links.pacienteXUrl); }} />;
}

/** Barra fija al pie de las pantallas de la familia: el contacto directo siempre a mano. */
export function BarraPacienteX({ conInsetInferior = false }: { conInsetInferior?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.barra, conInsetInferior && { paddingBottom: 12 + insets.bottom }]}>
      {/* En pantalla ancha el botón no se estira de punta a punta. */}
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        <BotonPacienteX />
      </View>
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
