/** Fiebre: los registros de todos los pacientes, los más recientes primero. */
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { fiebreDe, nombreCompleto, sinRevisar } from '@/data/selectores';
import { UMBRAL_FIEBRE, lineaRegistro } from '@/lib/fiebre';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Etiqueta } from '@/components/Etiqueta';
import { colors } from '@/theme';

export default function FiebreTodos() {
  const { db } = useApp();
  const porPaciente = db.patients
    .map((p) => ({ p, registros: fiebreDe(db, p.id) }))
    .filter((x) => x.registros.length > 0)
    .sort((a, b) => b.registros[0].at.localeCompare(a.registros[0].at));

  if (porPaciente.length === 0) return <Pantalla><Texto>No hay registros de fiebre.</Texto></Pantalla>;

  return (
    <Pantalla>
      {porPaciente.map(({ p, registros }) => {
        const pendientes = registros.filter(sinRevisar).length;
        const ultimaToma = registros.find((r) => r.kind === 'toma');
        const fiebre = (ultimaToma?.temperatureC ?? 0) >= UMBRAL_FIEBRE;
        return (
          <Tarjeta key={p.id} onPress={() => router.push(`/medico/fiebre/${p.id}`)} accessibilityLabel={`Registro de fiebre de ${p.firstName}`}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Ionicons name="thermometer-outline" size={26} color={fiebre ? colors.alert : colors.primary2} />
              <View style={{ flex: 1, gap: 4 }}>
                <TextoFuerte style={{ fontSize: 19 }}>{nombreCompleto(p)}</TextoFuerte>
                <TextoChico>Último: {lineaRegistro(registros[0])}</TextoChico>
                {pendientes > 0 ? <Etiqueta tono="azul" texto={`${pendientes} sin revisar`} /> : <Etiqueta tono="celeste" texto="Todo revisado" />}
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.primary3} />
            </View>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}
