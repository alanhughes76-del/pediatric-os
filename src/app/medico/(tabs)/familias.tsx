import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { membresiaDeFamilia, fiebreSinRevisarDeFamilia } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { colors } from '@/theme';

const textoEstado = { activa: 'Membresía activa', 'por-vencer': 'Membresía por vencer', vencida: 'Membresía vencida', 'sin-membresia': '' } as const;

/** Lista provisoria: la lista de pacientes con solapas por ámbito y buscador llega en la próxima entrega. */
export default function Familias() {
  const { db } = useApp();
  const familias = [...db.families].filter((f) => !f.archivedAt).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Pantalla>
      <TextoChico>{familias.length} familias · {db.patients.length} pacientes</TextoChico>
      {familias.map((f) => {
        const hijos = db.patients.filter((p) => p.familyId === f.id);
        const { estado } = membresiaDeFamilia(db, f.id);
        const fiebre = fiebreSinRevisarDeFamilia(db, f.id);
        return (
          <Tarjeta key={f.id} onPress={() => router.push(`/medico/familia/${f.id}`)} accessibilityLabel={`Ver ${f.name}`}>
            <View style={s.fila}>
              <View style={{ flex: 1, gap: 4 }}>
                <TextoFuerte style={{ fontSize: 20 }}>{f.name}</TextoFuerte>
                <Texto color={colors.textMuted}>{hijos.map((h) => h.firstName).join(', ')}</Texto>
                <View style={s.etiquetas}>
                  {estado !== 'sin-membresia' ? <Etiqueta texto={textoEstado[estado]} tono={estado === 'vencida' ? 'alerta' : 'celeste'} /> : null}
                  {fiebre > 0 ? <Etiqueta texto={`${fiebre} ${fiebre === 1 ? 'registro' : 'registros'} de fiebre sin revisar`} tono="azul" /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={26} color={colors.primary3} />
            </View>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
