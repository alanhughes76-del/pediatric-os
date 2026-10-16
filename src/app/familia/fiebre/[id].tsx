import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp, useSesionFamilia } from '@/data/store';
import { paciente, puedeVer } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { FiebreFamilia } from '@/components/fiebre/FiebreFamilia';

export default function FiebreDeHijo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  const p = paciente(db, id);
  if (!p || !puedeVer(db, guardian.id, id)) return <Pantalla><Texto>No encontramos este registro.</Texto></Pantalla>;
  return (
    <Pantalla>
      <Stack.Screen options={{ title: `Fiebre · ${p.firstName}` }} />
      <FiebreFamilia patientId={p.id} />
    </Pantalla>
  );
}
