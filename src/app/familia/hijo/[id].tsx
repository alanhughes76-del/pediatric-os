import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp, useSesionFamilia } from '@/data/store';
import { paciente, puedeVer } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { FichaHijo } from '@/components/FichaHijo';
import { Texto } from '@/components/Texto';

export default function FichaFamilia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  // Un adulto solo puede ver a los chicos con los que tiene una relación vigente.
  const propio = puedeVer(db, guardian.id, id);
  const p = paciente(db, id);

  return (
    <Pantalla ancho pie={<BarraPacienteX conInsetInferior />}>
      <Stack.Screen options={{ title: p && propio ? p.firstName : 'Ficha' }} />
      {propio ? <FichaHijo hijoId={id} /> : <Texto>No encontramos esta ficha.</Texto>}
    </Pantalla>
  );
}
