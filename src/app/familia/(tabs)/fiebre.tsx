import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, useSesionFamilia } from '@/data/store';
import { pacientesDeAdulto } from '@/data/selectores';
import { edades } from '@/lib/edad';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto, TextoFuerte } from '@/components/Texto';
import { FiebreFamilia } from '@/components/fiebre/FiebreFamilia';
import { colors } from '@/theme';

/** Atajo al registro de fiebre: si hay un solo hijo va directo; si hay más, se elige. */
export default function FiebreTab() {
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  const hijos = pacientesDeAdulto(db, guardian.id);

  if (hijos.length === 1) {
    return <Pantalla><FiebreFamilia patientId={hijos[0].id} /></Pantalla>;
  }
  return (
    <Pantalla>
      <Texto>¿De quién querés anotar la fiebre?</Texto>
      {hijos.map((h) => (
        <Tarjeta key={h.id} onPress={() => router.push(`/familia/fiebre/${h.id}`)} accessibilityLabel={`Registro de fiebre de ${h.firstName}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="thermometer-outline" size={28} color={colors.primary2} />
            <View style={{ flex: 1 }}>
              <TextoFuerte style={{ fontSize: 22 }}>{h.firstName}</TextoFuerte>
              <Texto color={colors.textMuted}>{edades(h).cronologica}</Texto>
            </View>
            <Ionicons name="chevron-forward" size={26} color={colors.primary3} />
          </View>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
