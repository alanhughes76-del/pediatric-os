/**
 * Registro de comunicaciones (prompt maestro 7.14): lecturas y textos. Es un registro, no un chat.
 */
import type { CanalComunicacion, ClaseComunicacion, Communication, Database, DireccionComunicacion, EstadoComunicacion } from './types';

export const TEXTO_CANAL: Record<CanalComunicacion, string> = {
  email: 'Email', pacientex: 'PacienteX', telefono: 'Teléfono', presencial: 'En persona', telegram: 'Telegram', otro: 'Otro',
};
export const TEXTO_CLASE: Record<ClaseComunicacion, string> = { administrativo: 'Administrativo', clinico: 'Clínico', urgente: 'Urgente' };
export const TEXTO_ESTADO: Record<EstadoComunicacion, string> = {
  registrado: 'Registrado', enviado_a_make: 'Enviado a Make', entregado: 'Entregado', fallido: 'No se entregó',
};
export const TEXTO_TIPO: Record<Communication['kind'], string> = {
  resumen_familia: 'Resumen de la visita', recordatorio: 'Recordatorio', aviso: 'Aviso', manual: 'Registrado a mano',
};

/** Con los valores por omisión de los registros viejos. */
export const direccionDe = (c: Communication): DireccionComunicacion => c.direction ?? 'saliente';
export const claseDe = (c: Communication): ClaseComunicacion => c.classification ?? (c.kind === 'resumen_familia' ? 'clinico' : 'administrativo');
export const momentoDe = (c: Communication) => c.at ?? c.createdAt;

export interface FiltroComunicaciones {
  direccion?: DireccionComunicacion;
  clase?: ClaseComunicacion;
  familyId?: string;
}

/** Del más nuevo al más viejo, sin archivados. */
export function comunicaciones(db: Database, f: FiltroComunicaciones = {}): Communication[] {
  return db.communications
    .filter((c) => !c.archivedAt)
    .filter((c) => !f.direccion || direccionDe(c) === f.direccion)
    .filter((c) => !f.clase || claseDe(c) === f.clase)
    .filter((c) => !f.familyId || familiaDe(db, c) === f.familyId)
    .sort((a, b) => momentoDe(b).localeCompare(momentoDe(a)));
}

/** La familia de una comunicación: la suya o la del paciente. */
export function familiaDe(db: Database, c: Communication): string | undefined {
  return c.familyId ?? db.patients.find((p) => p.id === c.patientId)?.familyId;
}

/** "Familia Ruiz Ferreyra · Tomás" */
export function destinoDe(db: Database, c: Communication): string {
  const familia = db.families.find((f) => f.id === familiaDe(db, c))?.name;
  const chico = db.patients.find((p) => p.id === c.patientId)?.firstName;
  return [familia, chico].filter(Boolean).join(' · ') || 'Sin familia';
}
