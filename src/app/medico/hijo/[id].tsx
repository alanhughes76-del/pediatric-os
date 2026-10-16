import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { FichaHijo } from '@/components/FichaHijo';

export default function FichaMedico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const p = paciente(db, id);
  return (
    <Pantalla>
      <Stack.Screen options={{ title: p ? p.firstName : 'Ficha' }} />
      <FichaHijo hijoId={id} vista="medico" />
    </Pantalla>
  );
}
