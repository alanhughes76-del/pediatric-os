/** Esquema de vacunas en la app: las filas que se guardan para un paciente (ids estables). */
import { esquemaPara } from '@shared/vacunas';
import type { VaccineDose } from './types';

/** Id de la dosis: en Firestore el documento se llama `clave`; en memoria lleva también el paciente. */
export const idDosis = (patientId: string, clave: string) => `vd-${patientId}-${clave}`;

export function dosisDelEsquema(patientId: string, fechaNacimiento: string, ahora: string, usuarioId: string): VaccineDose[] {
  return esquemaPara(fechaNacimiento).map((v) => ({
    id: idDosis(patientId, v.clave), createdAt: ahora, createdBy: usuarioId, patientId,
    vaccine: v.vaccine, dose: v.dose, ageText: v.ageText, ageMonths: v.ageMonths, dueDate: v.dueDate,
    status: 'pendiente', source: 'calendario',
  }));
}
