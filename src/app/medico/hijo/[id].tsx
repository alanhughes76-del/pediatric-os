import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { FichaPaciente } from '@/components/ficha/FichaPaciente';

export default function FichaMedico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const p = paciente(db, id);
  return (
    <Pantalla ancho>
      <Stack.Screen options={{ title: p ? p.firstName : 'Ficha' }} />
      <FichaPaciente patientId={id} />
    </Pantalla>
  );
}
