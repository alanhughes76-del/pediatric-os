import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { FormularioFiebre } from '@/components/fiebre/FormularioFiebre';

export default function NuevoRegistroMedico() {
  const { paciente: pid, tipo } = useLocalSearchParams<{ paciente: string; tipo: 'toma' | 'antitermico' }>();
  const { db } = useApp();
  const p = paciente(db, pid);
  if (!p) return <Pantalla><Texto>No encontramos a este paciente.</Texto></Pantalla>;
  return (
    <Pantalla>
      <Stack.Screen options={{ title: `Registro a mano · ${p.firstName}` }} />
      <FormularioFiebre patientId={p.id} tipo={tipo === 'antitermico' ? 'antitermico' : 'toma'} porMedico onListo={() => router.back()} />
    </Pantalla>
  );
}
