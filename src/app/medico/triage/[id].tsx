/** Un triage de urgencia (solo el médico), con el turno al que quedó adjunto si lo hay. */
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { Pantalla } from '@/components/Pantalla';
import { Boton } from '@/components/Boton';
import { EstadoVacio } from '@/components/Estados';
import { TextoChico } from '@/components/Texto';
import { TriageUrgencia } from '@/components/TriageUrgencia';

export default function TriagePantalla() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const t = db.triage.find((x) => x.id === id);
  if (!t) return <Pantalla><EstadoVacio icono="help-circle-outline" titulo="No encontramos este triage" /></Pantalla>;
  const familia = db.families.find((f) => f.id === t.familyId);
  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Triage de urgencia' }} />
      <TriageUrgencia t={t} />
      {t.appointmentId ? <Boton titulo="Abrir la solicitud de urgencia" icono="calendar-outline" variante="secundario" onPress={() => router.push(`/medico/turno/${t.appointmentId}`)} /> : (
        <TextoChico>No encontramos una solicitud de urgencia de este contacto en las últimas 24 horas.</TextoChico>
      )}
      {familia ? <Boton titulo={`Abrir ${familia.name}`} variante="contorno" onPress={() => router.push(`/medico/familia/${familia.id}`)} /> : null}
    </Pantalla>
  );
}
