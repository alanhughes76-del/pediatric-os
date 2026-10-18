import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { BotonIA, FichaPaciente, type SolapaFicha } from '@/components/ficha/FichaPaciente';
import { useEscritorio } from '@/components/escritorio/Marco';

export default function FichaMedico() {
  const { id, solapa } = useLocalSearchParams<{ id: string; solapa?: SolapaFicha }>();
  const { db } = useApp();
  const p = paciente(db, id);
  const escritorio = useEscritorio();
  return (
    <Pantalla ancho pie={!escritorio && p ? <BotonIA patientId={p.id} /> : undefined}>
      <Stack.Screen options={{ title: p ? p.firstName : 'Ficha' }} />
      <FichaPaciente patientId={id} solapaInicial={solapa} />
    </Pantalla>
  );
}
