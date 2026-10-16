import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp, useSesionFamilia } from '@/data/store';
import { paciente, puedeVer } from '@/data/selectores';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { FormularioFiebre } from '@/components/fiebre/FormularioFiebre';

export default function NuevoRegistroFamilia() {
  const { paciente: pid, tipo } = useLocalSearchParams<{ paciente: string; tipo: 'toma' | 'antitermico' }>();
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  const p = paciente(db, pid);
  if (!p || !puedeVer(db, guardian.id, pid)) return <Pantalla><Texto>No encontramos a este paciente.</Texto></Pantalla>;
  return (
    <Pantalla>
      <Stack.Screen options={{ title: tipo === 'antitermico' ? `Antitérmico · ${p.firstName}` : `Temperatura · ${p.firstName}` }} />
      <FormularioFiebre patientId={p.id} tipo={tipo === 'antitermico' ? 'antitermico' : 'toma'} onListo={() => router.back()} />
    </Pantalla>
  );
}
