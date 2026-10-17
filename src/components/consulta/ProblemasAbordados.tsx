/**
 * Problemas de salud que se abordaron en la consulta (prompt maestro 7.5).
 * Se tildan de la lista del paciente; tildar guarda solo. Los problemas nuevos se cargan
 * en la ficha (Historia clínica).
 */
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import type { Consultation } from '@/data/types';
import { fechaCorta, hora } from '@/lib/fechas';
import { Casilla } from '@/components/Formulario';
import { Texto, TextoChico } from '@/components/Texto';
import { BotonTexto } from '@/components/ficha/piezas';
import { colors } from '@/theme';

export function ProblemasAbordados({ consulta }: { consulta: Consultation }) {
  const { db, actualizar } = useApp();
  const elegidos = consulta.problemIds ?? [];
  // Activos primero; los resueltos solo si ya estaban tildados (para no perder el registro).
  const problemas = db.problems
    .filter((p) => p.patientId === consulta.patientId && !p.archivedAt && (p.status === 'activo' || elegidos.includes(p.id)))
    .sort((a, b) => (a.status === b.status ? a.description.localeCompare(b.description) : a.status === 'activo' ? -1 : 1));

  const cambiar = (id: string, marcado: boolean) => {
    const ids = marcado ? [...elegidos, id] : elegidos.filter((x) => x !== id);
    actualizar('consultations', consulta.id, { problemIds: ids }, marcado ? 'consulta.problema-abordado' : 'consulta.problema-quitado');
  };

  return (
    <View style={{ gap: 4 }}>
      {problemas.length === 0 ? <Texto color={colors.textMuted}>Este paciente no tiene problemas activos cargados.</Texto> : null}
      {problemas.map((p) => (
        <Casilla
          key={p.id}
          texto={p.description}
          detalle={p.status === 'resuelto' ? 'Resuelto' : p.since ? `Desde ${fechaCorta(p.since)}` : undefined}
          marcada={elegidos.includes(p.id)}
          onCambio={(v) => cambiar(p.id, v)}
        />
      ))}
      <TextoChico>Los problemas nuevos se cargan en la ficha, en Historia clínica.</TextoChico>
    </View>
  );
}

/** "Turno de origen: 17/10 09:30", con acceso al turno. */
export function TurnoDeOrigen({ consulta }: { consulta: Consultation }) {
  const { db } = useApp();
  const t = consulta.appointmentId ? db.appointments.find((a) => a.id === consulta.appointmentId) : undefined;
  if (!t) return null;
  return <BotonTexto texto={`Turno de origen: ${fechaCorta(t.start)} ${hora(t.start)}`} onPress={() => router.push(`/medico/turno/${t.id}`)} />;
}
