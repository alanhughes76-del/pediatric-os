/** "Abrir consulta" desde un turno: usa la consulta de ese turno y paciente, o crea una. */
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { consultaDeTurno } from '@/data/selectores';
import type { Appointment, VisitType } from '@/data/types';

export function useAbrirConsulta() {
  const { db, agregar } = useApp();
  return (t: Appointment, patientId: string) => {
    const existente = consultaDeTurno(db, t.id, patientId);
    const id = existente?.id ?? agregar('consultations', {
      patientId,
      occurredAt: t.start,
      modality: t.modality,
      // Un turno prenatal no lleva paciente, así que acá nunca llega.
      visitType: (t.type === 'prenatal' ? 'control' : t.type) as VisitType,
      status: 'realizada',
      appointmentId: t.id,
      ...(t.address?.addressId ? { addressId: t.address.addressId } : {}),
      rawText: '',
    }, 'consulta.crear');
    router.push(`/medico/consulta/${id}`);
  };
}
