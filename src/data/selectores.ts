/**
 * Lecturas sobre los datos, con las reglas de visibilidad en un solo lugar.
 *
 * Lo que ve la familia (en el backend se replica como reglas de acceso del servidor):
 * - Solo los pacientes con los que el adulto tiene una relación vigente.
 * - De las notas, solo el "Resumen para la familia" de notas APROBADAS. Nunca hallazgos ni conducta.
 * - Alergias confirmadas (nunca las referidas). Problemas que el médico hizo visibles.
 * - Plan de cuidado: los ítems pendientes ("Plan vigente").
 * - Si la membresía vence, conserva acceso de lectura a todo lo anterior.
 */
import type { Database, Patient, Consultation, ClinicalNote, FeverEntry, VisitType, Modality, ID, Address, PatientRelationship, CoverageKind, Appointment, AppointmentChange } from './types';
import { hoyISO, diasEntre, horasEntre, ahoraISO } from '@/lib/fechas';
import { estaVigente } from '@shared/agenda';
import { horasDeSeguimiento as horasDeSeguimientoComun, mensajeSeguimiento } from '@shared/seguimiento';

export type Vista = 'medico' | 'familia';

export const TEXTO_VISITA: Record<VisitType, string> = {
  control: 'Control',
  'urgencia-dia': 'Urgencia día',
  'urgencia-noche': 'Urgencia noche',
  seguimiento: 'Seguimiento',
  rn: 'RN',
};

export const TEXTO_COBERTURA: Record<CoverageKind, string> = { prepaga: 'Prepaga', 'obra-social': 'Obra social', particular: 'Particular' };

/** "Prepaga de ejemplo 210" o "Particular". */
export const textoCobertura = (c?: { kind: CoverageKind; name?: string }) => (!c ? undefined : c.kind === 'particular' ? 'Particular' : c.name || TEXTO_COBERTURA[c.kind]);

export const TEXTO_MODALIDAD: Record<Modality, string> = {
  domicilio: 'Domicilio',
  telemedicina: 'Telemedicina',
  otro: 'Otro',
};

export const esUrgencia = (t: VisitType) => t === 'urgencia-dia' || t === 'urgencia-noche';

const activo = <T extends { archivedAt?: string }>(f: T) => !f.archivedAt;

export const nombreCompleto = (p: Pick<Patient, 'firstName' | 'lastName'>) => `${p.firstName} ${p.lastName}`;

export function paciente(db: Database, id: ID): Patient | undefined {
  return db.patients.find((p) => p.id === id && activo(p));
}

/** Relaciones vigentes de un paciente. */
function relacionesVigentes(db: Database, patientId: ID) {
  const hoy = hoyISO();
  return db.relationships.filter((r) => r.patientId === patientId && activo(r) && (!r.validTo || r.validTo > hoy));
}

/** Un vínculo está vigente si no tiene fecha de fin, o si termina después de hoy. "Quitar vínculo" pone hoy como fin. */

/** Pacientes que puede ver un adulto en el portal. */
export function pacientesDeAdulto(db: Database, guardianId: ID): Patient[] {
  const hoy = hoyISO();
  const ids = new Set(db.relationships.filter((r) => r.guardianId === guardianId && activo(r) && (!r.validTo || r.validTo > hoy)).map((r) => r.patientId));
  return db.patients.filter((p) => ids.has(p.id) && activo(p)).sort((a, b) => a.birthDate.localeCompare(b.birthDate));
}

export function puedeVer(db: Database, guardianId: ID, patientId: ID) {
  return pacientesDeAdulto(db, guardianId).some((p) => p.id === patientId);
}

/** Adultos responsables de un paciente, con su relación y domicilios. */
export function adultosDe(db: Database, patientId: ID) {
  return relacionesVigentes(db, patientId)
    .map((rel) => ({
      rel,
      guardian: db.guardians.find((g) => g.id === rel.guardianId)!,
      domicilios: db.addresses.filter((a) => a.guardianId === rel.guardianId && activo(a)),
    }))
    .filter((x) => x.guardian)
    .sort((a, b) => Number(b.rel.isPrimary) - Number(a.rel.isPrimary));
}

/** "Madre", "Padre" o el detalle que se cargó para "otro" ("Abuela"). */
export function textoRelacion(rel: Pick<PatientRelationship, 'type' | 'typeDetail'>): string {
  if (rel.type === 'madre') return 'Madre';
  if (rel.type === 'padre') return 'Padre';
  const d = rel.typeDetail?.trim();
  return d ? d[0].toUpperCase() + d.slice(1) : 'Otro';
}

/** Adulto marcado como contacto principal (o el primero, si ninguno está marcado). */
export function adultoPrincipal(db: Database, patientId: ID) {
  const adultos = adultosDe(db, patientId);
  return adultos.find((a) => a.rel.isPrimary) ?? adultos[0];
}

/** Pacientes vinculados (vigentes) a un adulto, con su relación. */
export function pacientesVinculados(db: Database, guardianId: ID) {
  const hoy = hoyISO();
  return db.relationships
    .filter((r) => r.guardianId === guardianId && activo(r) && (!r.validTo || r.validTo > hoy))
    .map((rel) => ({ rel, paciente: db.patients.find((p) => p.id === rel.patientId) }))
    .filter((x): x is { rel: PatientRelationship; paciente: Patient } => !!x.paciente && !x.paciente.archivedAt);
}

export function domicilioDe(db: Database, c: Pick<Consultation, 'addressId' | 'patientId'>): Address | undefined {
  if (c.addressId) return db.addresses.find((a) => a.id === c.addressId);
  return adultosDe(db, c.patientId)[0]?.domicilios[0];
}

export const textoDomicilio = (a?: Address) => (a ? `${a.street}, ${a.locality}` : 'Sin domicilio cargado');

// ---------- Membresía ----------

export type EstadoMembresia = 'activa' | 'por-vencer' | 'vencida' | 'sin-membresia';
const AVISO_DIAS = 30;

export function membresiaDeFamilia(db: Database, familyId?: ID) {
  const membership = db.memberships
    .filter((m) => m.familyId === familyId && activo(m))
    .sort((a, b) => b.renewalDate.localeCompare(a.renewalDate))[0];
  if (!membership) return { estado: 'sin-membresia' as EstadoMembresia };
  const diasRestantes = diasEntre(hoyISO(), membership.renewalDate);
  const estado: EstadoMembresia =
    membership.status !== 'activa' || diasRestantes < 0 ? 'vencida' : diasRestantes <= AVISO_DIAS ? 'por-vencer' : 'activa';
  return { membership, estado, diasRestantes };
}

/**
 * ¿Puede pedir visitas como miembro? No, si la membresía de su familia está vencida.
 * (Las familias sin membresía —otros ámbitos— siguen pidiendo como hasta ahora.)
 */
export function puedePedirVisitas(db: Database, guardianId: ID): boolean {
  const g = db.guardians.find((x) => x.id === guardianId);
  const familyId = pacientesDeAdulto(db, guardianId)[0]?.familyId ?? g?.familyId;
  return membresiaDeFamilia(db, familyId).estado !== 'vencida';
}

export const TEXTO_MEMBRESIA_VENCIDA = 'Tu membresía venció. Para pedir una visita, contactame por PacienteX.';

// ---------- Consultas y notas ----------

export function consultasDe(db: Database, patientId: ID, estado: Consultation['status'] = 'realizada') {
  return db.consultations
    .filter((c) => c.patientId === patientId && c.status === estado && activo(c))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/** Todas las versiones de la nota de una consulta, de la más vieja a la más nueva. */
export function versionesDeNota(db: Database, consultationId: ID): ClinicalNote[] {
  return db.notes.filter((n) => n.consultationId === consultationId).sort((a, b) => a.version - b.version);
}

/** La versión en uso: la última que no fue reemplazada. */
export function notaVigente(db: Database, consultationId: ID): ClinicalNote | undefined {
  return versionesDeNota(db, consultationId).filter((n) => n.status !== 'reemplazada').pop();
}

/** Informes para la familia: solo el resumen de notas aprobadas. */
export function informesFamilia(db: Database, patientId: ID) {
  return consultasDe(db, patientId)
    .map((c) => {
      const nota = db.notes.find((n) => n.consultationId === c.id && n.status === 'aprobada');
      return nota && nota.familySummary.trim() ? { consulta: c, resumen: nota.familySummary, version: nota.version, aprobadaEn: nota.approvedAt! } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export function alergiasDe(db: Database, patientId: ID, vista: Vista) {
  return db.allergies.filter((a) => a.patientId === patientId && activo(a) && (vista === 'medico' || a.status === 'confirmada'));
}

export function problemasDe(db: Database, patientId: ID, vista: Vista) {
  return db.problems.filter((p) => p.patientId === patientId && activo(p) && (vista === 'medico' || p.visibleToFamily));
}

export function medicionesDe(db: Database, patientId: ID) {
  return db.measurements.filter((m) => m.patientId === patientId && activo(m)).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export function medicionDeConsulta(db: Database, consultationId: ID) {
  return db.measurements.find((m) => m.consultationId === consultationId && activo(m));
}

// ---------- Turnos (Etapa 3) ----------

const porInicio = (a: Appointment, b: Appointment) => a.start.localeCompare(b.start);

/** Turnos de un día en orden. Sin cancelados ni ausentes, salvo con `todos`. */
export function turnosDelDia(db: Database, fecha = hoyISO(), todos = false): Appointment[] {
  return db.appointments
    .filter((a) => a.day === fecha && !a.archivedAt && (todos || estaVigente(a.status)))
    .sort(porInicio);
}

/** Turnos entre dos días (incluidos), vigentes. */
export function turnosEntre(db: Database, desde: string, hasta: string): Appointment[] {
  return db.appointments
    .filter((a) => a.day >= desde && a.day <= hasta && !a.archivedAt && estaVigente(a.status))
    .sort(porInicio);
}

/** Próximo turno (pendiente o confirmado) de alguno de estos pacientes. */
export function proximoTurno(db: Database, patientIds: ID[], ahora = ahoraISO()): Appointment | undefined {
  const ids = new Set(patientIds);
  return db.appointments
    .filter((a) => !a.archivedAt && (a.status === 'confirmado' || a.status === 'pendiente') && a.start >= ahora && a.patientIds.some((p) => ids.has(p)))
    .sort(porInicio)[0];
}

/** Solicitudes nuevas y turnos pendientes de confirmar, desde hoy. */
export function porConfirmar(db: Database, fecha = hoyISO()): Appointment[] {
  return db.appointments
    .filter((a) => !a.archivedAt && (a.status === 'solicitado' || a.status === 'pendiente') && a.day >= fecha)
    .sort(porInicio);
}

export function historialDeTurno(db: Database, id: ID): AppointmentChange[] {
  return db.appointmentHistory.filter((h) => h.appointmentId === id).sort((a, b) => a.atMs - b.atMs);
}

export function pacientesDeTurno(db: Database, t: Appointment): Patient[] {
  return t.patientIds.map((id) => db.patients.find((p) => p.id === id)).filter((p): p is Patient => !!p);
}

/** Quién va en el turno: los chicos ("Tomás y Emma Ruiz Ferreyra"), la familia o el contacto por identificar. */
export function nombreDeTurno(db: Database, t: Appointment): string {
  const chicos = pacientesDeTurno(db, t);
  if (chicos.length === 1) return nombreCompleto(chicos[0]);
  if (chicos.length > 1) {
    const apellidos = new Set(chicos.map((c) => c.lastName));
    const nombres = chicos.map((c) => c.firstName);
    const lista = `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
    return apellidos.size === 1 ? `${lista} ${chicos[0].lastName}` : chicos.map(nombreCompleto).join(', ');
  }
  if (t.porIdentificar) return `${t.porIdentificar.name || 'Sin nombre'} (por identificar)`;
  const familia = db.families.find((f) => f.id === t.familyId);
  return familia ? `${familia.name} (prenatal)` : 'Familia por identificar';
}

export const textoDireccionTurno = (t: Appointment) =>
  t.address ? [t.address.text, t.address.locality].filter(Boolean).join(', ') : 'Sin dirección cargada';

/** Consulta abierta desde este turno para ese paciente. */
export function consultaDeTurno(db: Database, turnoId: ID, patientId: ID): Consultation | undefined {
  return db.consultations.find((c) => c.appointmentId === turnoId && c.patientId === patientId && !c.archivedAt);
}

// ---------- Seguimientos ----------

/** Horas para el vencimiento: 24 h si fue urgencia, 48 h en el resto (desde la consulta). */
export const horasDeSeguimiento = (t: VisitType) => horasDeSeguimientoComun(t);

export function seguimientosPendientes(db: Database) {
  return db.followUps
    .filter((f) => f.status === 'pendiente' && activo(f))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** Borrador de mensaje para la familia, armado con el resumen y la conducta. */
export function mensajeDeSeguimiento(db: Database, nota: ClinicalNote): string {
  const adulto = adultosDe(db, nota.patientId)[0]?.guardian;
  return mensajeSeguimiento({ nombreAdulto: adulto?.firstName, resumenFamilia: nota.familySummary, conducta: nota.plan });
}

// ---------- Fiebre ----------

export function fiebreDe(db: Database, patientId: ID): FeverEntry[] {
  return db.fever.filter((f) => f.patientId === patientId && activo(f)).sort((a, b) => b.at.localeCompare(a.at));
}

export const sinRevisar = (f: FeverEntry) => !f.reviewedAt;

/** Cantidad de registros de fiebre sin revisar de los pacientes de una familia. */
export function fiebreSinRevisarDeFamilia(db: Database, familyId: ID) {
  const ids = new Set(db.patients.filter((p) => p.familyId === familyId).map((p) => p.id));
  return db.fever.filter((f) => ids.has(f.patientId) && activo(f) && sinRevisar(f)).length;
}

/** ¿Hubo un antitérmico anotado en las 6 horas previas a este momento? */
export function antitermicoPrevio(db: Database, patientId: ID, at: string, excluirId?: ID) {
  return db.fever.find((f) => f.patientId === patientId && f.kind === 'antitermico' && f.id !== excluirId && activo(f) && horasEntre(f.at, at) >= 0 && horasEntre(f.at, at) <= 6);
}

/** Consulta realizada más cercana en fecha a un registro. */
export function consultaMasCercana(db: Database, patientId: ID, at: string) {
  return consultasDe(db, patientId).sort((a, b) => Math.abs(horasEntre(a.occurredAt, at)) - Math.abs(horasEntre(b.occurredAt, at)))[0];
}

/** Nombre de quien cargó un registro. */
export function autor(db: Database, userId: ID): string {
  if (userId === db.doctor.id) return db.doctor.name;
  const g = db.guardians.find((x) => x.id === userId);
  return g ? `${g.firstName} ${g.lastName}` : 'Alguien';
}
