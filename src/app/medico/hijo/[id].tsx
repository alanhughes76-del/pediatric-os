import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { FichaPaciente, type SolapaFicha } from '@/components/ficha/FichaPaciente';

export default function FichaMedico() {
  const { id, solapa } = useLocalSearchParams<{ id: string; solapa?: SolapaFicha }>();
  const { db } = useApp();
  const p = paciente(db, id);
  return (
    <Pantalla ancho>
      <Stack.Screen options={{ title: p ? p.firstName : 'Ficha' }} />
      <FichaPaciente patientId={id} solapaInicial={solapa} />
    </Pantalla>
  );
}
