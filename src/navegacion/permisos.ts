/**
 * Qué ve el asistente administrativo (prompt maestro 4): agenda, turnos, familias, membresías y
 * pagos. **Nunca** datos clínicos. Las reglas de Firestore ya lo impiden en el servidor; esto evita
 * que la app le muestre pantallas vacías o engañosas ("Sin alergias", "Todavía no hay visitas").
 */
import type { Href } from 'expo-router';
import type { Database } from '@/data/types';
import { MODULOS, type Modulo } from './modulos';

export type RolEquipo = 'medico' | 'asistente';

/** Módulos de la barra lateral que ve el asistente. */
const MODULOS_ASISTENTE = ['inicio', 'agenda', 'pacientes', 'familias'];

/** Rutas a las que puede entrar el asistente (prefijos). Todo lo demás es solo del médico. */
const RUTAS_ASISTENTE = [
  '/medico/agenda', '/medico/turno', '/medico/pacientes', '/medico/paciente/nuevo',
  '/medico/familias', '/medico/familia', '/medico/membresias', '/medico/membresia', '/medico/pago',
  '/medico/adulto', '/medico/interesados', '/medico/mas', '/medico/avisos',
];

export const modulosDe = (rol: RolEquipo): Modulo[] => (rol === 'medico' ? MODULOS : MODULOS.filter((m) => MODULOS_ASISTENTE.includes(m.clave)));

export function puedeEntrar(rol: RolEquipo, ruta: string): boolean {
  if (rol === 'medico') return true;
  if (ruta === '/medico' || ruta === '/medico/') return true;
  return RUTAS_ASISTENTE.some((r) => ruta === r || ruta.startsWith(`${r}/`));
}

/** Adónde lleva tocar un paciente: la ficha clínica (médico) o su familia (asistente). */
export function rutaDelPaciente(rol: RolEquipo, p: { id: string; familyId?: string }): Href {
  if (rol === 'medico') return `/medico/hijo/${p.id}`;
  return p.familyId ? `/medico/familia/${p.familyId}` : '/medico/pacientes';
}

/** Tablas clínicas y de trazabilidad que el asistente nunca recibe (también en la demostración). */
const SOLO_MEDICO = [
  'backgrounds', 'problems', 'allergies', 'consultations', 'measurements', 'milestoneChecks', 'notes', 'followUps',
  'carePlan', 'vaccineDoses', 'medications', 'prescriptions', 'studies', 'fever', 'certificates', 'documents',
  'materialDeliveries', 'aiInteractions', 'admisiones', 'triage', 'transcripciones', 'auditLog', 'outbox',
] as const satisfies readonly (keyof Database)[];

/**
 * Lo que ve el asistente: la base sin nada clínico (la IA, apagada) y los turnos sin el motivo,
 * que suele decir qué le pasa al chico ("Fiebre desde ayer"). Puede cargarlo en un turno nuevo, no leerlo.
 */
export function vistaAsistente(db: Database): Database {
  const vacias = Object.fromEntries(SOLO_MEDICO.map((t) => [t, []]));
  return { ...db, ...vacias, appointments: db.appointments.map((t) => ({ ...t, reason: '' })), ia: { enabled: false } } as Database;
}
