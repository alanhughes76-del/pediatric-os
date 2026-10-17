/**
 * Lecturas de la Etapa 5: medicación, prescripciones y estudios. Lógica pura, con tests.
 * La plataforma nunca sugiere ni calcula dosis: acá solo se ordena y se filtra lo que carga el médico.
 */
import type { Database, ID, Medication, Patient, StudyOrder, StudyStatus } from './types';

const activo = (x: { archivedAt?: string }) => !x.archivedAt;

/** Activa: sin fecha de fin, o con la fecha de fin de hoy en adelante. */
export const medicacionActiva = (m: Pick<Medication, 'endDate'>, hoy: string) => !m.endDate || m.endDate >= hoy;

export function medicacionDe(db: Database, patientId: ID, hoy: string) {
  const todas = db.medications.filter((m) => m.patientId === patientId && activo(m)).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return { activas: todas.filter((m) => medicacionActiva(m, hoy)), anteriores: todas.filter((m) => !medicacionActiva(m, hoy)) };
}

export function prescripcionesDe(db: Database, patientId: ID) {
  return db.prescriptions.filter((p) => p.patientId === patientId && activo(p)).sort((a, b) => b.date.localeCompare(a.date));
}

export const TEXTO_ESTUDIO: Record<StudyStatus, string> = {
  solicitado: 'Solicitado',
  realizado: 'Realizado',
  resultado: 'Resultado recibido',
  revisado: 'Revisado',
};

/** Siguiente estado del estudio (solicitado → realizado → resultado recibido → revisado). */
export const SIGUIENTE_ESTUDIO: Partial<Record<StudyStatus, StudyStatus>> = { solicitado: 'realizado', realizado: 'resultado', resultado: 'revisado' };

export function estudiosDe(db: Database, patientId: ID) {
  const orden: Record<StudyStatus, number> = { resultado: 0, solicitado: 1, realizado: 2, revisado: 3 };
  return db.studies
    .filter((e) => e.patientId === patientId && activo(e))
    .sort((a, b) => orden[a.status] - orden[b.status] || b.orderedDate.localeCompare(a.orderedDate));
}

/** Resultados recibidos sin revisar (van a Inicio). `vencido`: ya pasó la fecha "Revisar resultado el". */
export function resultadosSinRevisar(db: Database, hoy: string): { estudio: StudyOrder; paciente: Patient; vencido: boolean }[] {
  return db.studies
    .filter((e) => activo(e) && e.status === 'resultado')
    .map((estudio) => ({ estudio, paciente: db.patients.find((p) => p.id === estudio.patientId && activo(p))!, vencido: !!estudio.reviewDate && estudio.reviewDate < hoy }))
    .filter((x) => x.paciente)
    .sort((a, b) => (a.estudio.reviewDate ?? '9').localeCompare(b.estudio.reviewDate ?? '9'));
}

/** Para el módulo Estudios: todos los pendientes de algo (no revisados), por paciente. */
export function estudiosAbiertos(db: Database): { estudio: StudyOrder; paciente: Patient }[] {
  const orden: Record<StudyStatus, number> = { resultado: 0, realizado: 1, solicitado: 2, revisado: 3 };
  return db.studies
    .filter((e) => activo(e) && e.status !== 'revisado')
    .map((estudio) => ({ estudio, paciente: db.patients.find((p) => p.id === estudio.patientId && activo(p))! }))
    .filter((x) => x.paciente)
    .sort((a, b) => orden[a.estudio.status] - orden[b.estudio.status] || (a.estudio.reviewDate ?? '9').localeCompare(b.estudio.reviewDate ?? '9'));
}

/** Para el módulo Prescripciones: la medicación activa de todos los pacientes. */
export function medicacionActivaDeTodos(db: Database, hoy: string): { medicacion: Medication; paciente: Patient }[] {
  return db.medications
    .filter((m) => activo(m) && medicacionActiva(m, hoy))
    .map((medicacion) => ({ medicacion, paciente: db.patients.find((p) => p.id === medicacion.patientId && activo(p))! }))
    .filter((x) => x.paciente)
    .sort((a, b) => a.paciente.lastName.localeCompare(b.paciente.lastName));
}
