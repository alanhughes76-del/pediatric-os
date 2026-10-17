/**
 * Turnos en el modo demostración: hace en memoria lo mismo que el servidor (functions/src/turnos),
 * con las mismas reglas de shared/agenda.ts. Lógica pura, con tests.
 */
import {
  accionPermitida, avisosDeTurno, diaDe, estadoDespues, horaDe, inicioDe, ocupaLugar, zonaDe, TEXTO_ESTADO_TURNO,
  type AccionTurno,
} from '@shared/agenda';
import type { Appointment, AppointmentChange, Database } from './types';
import type { DatosTurno, PedidoAccionTurno, PedidoVisita, ResultadoTurno } from './contrato';

export interface Contexto { ahora: string; ahoraMs: number; usuarioId: string; nuevoId: (prefijo: string) => string }

type Salida = { db: Database; resultado: ResultadoTurno };

const resumen = (t: Appointment | null) => (t ? { status: t.status, start: t.start, durationMin: t.durationMin } : null);

function completar(t: Appointment, db: Database): Appointment {
  const lugar = t.address ? t.address.locality || t.address.text : '';
  return { ...t, day: diaDe(t.start), zone: t.modality === 'domicilio' ? zonaDe(lugar, db.agenda.zonas) : null };
}

/** Revisa choques y avisos. Devuelve un resultado si hay que frenar; null si se puede guardar. */
function revisar(db: Database, antes: Appointment | null, despues: Appointment, aceptarAvisos: boolean): ResultadoTurno | null {
  const avisos = avisosDeTurno({
    turno: { id: despues.id, start: despues.start, durationMin: despues.durationMin, modality: despues.modality, locality: despues.address ? despues.address.locality || despues.address.text : '' },
    quedaConfirmado: ocupaLugar(despues.status),
    otros: db.appointments,
    config: db.agenda,
    bloqueos: db.blocks,
  });
  const bloqueo = avisos.find((a) => a.bloquea);
  if (bloqueo) return { estado: 'error', mensaje: bloqueo.mensaje };
  const cambioRelevante = !antes || antes.start !== despues.start || antes.durationMin !== despues.durationMin
    || antes.status !== despues.status || JSON.stringify(antes.address) !== JSON.stringify(despues.address);
  if (avisos.length > 0 && cambioRelevante && !aceptarAvisos) return { estado: 'avisos', avisos };
  return null;
}

function guardar(db: Database, ctx: Contexto, antes: Appointment | null, despues: Appointment, accion: AppointmentChange['action'], motivo?: string): Database {
  const cambio: AppointmentChange = {
    id: ctx.nuevoId('th'), appointmentId: despues.id, at: ctx.ahora, atMs: ctx.ahoraMs, actorId: ctx.usuarioId,
    action: accion, before: resumen(antes), after: resumen(despues), ...(motivo ? { reason: motivo } : {}),
  };
  return {
    ...db,
    appointments: antes ? db.appointments.map((a) => (a.id === despues.id ? despues : a)) : [...db.appointments, despues],
    appointmentHistory: [...db.appointmentHistory, cambio],
    auditLog: [...db.auditLog, { id: ctx.nuevoId('au'), at: ctx.ahora, actorId: ctx.usuarioId, action: `turno.${accion}`, entity: 'appointments', entityId: despues.id }],
  };
}

function validar(d: Partial<DatosTurno>): string | null {
  if (d.type !== 'prenatal' && d.patientIds && d.patientIds.length === 0) return 'Elegí al menos un paciente.';
  if (d.type === 'prenatal' && !d.familyId) return 'Un turno prenatal va con la familia: elegila.';
  if (d.durationMin !== undefined && (d.durationMin < 10 || d.durationMin > 480)) return 'La duración tiene que estar entre 10 y 480 minutos.';
  if (d.start !== undefined && Number.isNaN(Date.parse(d.start))) return 'Revisá la fecha y la hora del turno.';
  return null;
}

export function crearTurnoDemo(db: Database, ctx: Contexto, d: DatosTurno & { confirmar: boolean; aceptarAvisos?: boolean }): Salida {
  const error = validar(d);
  if (error) return { db, resultado: { estado: 'error', mensaje: error } };
  const familia = d.familyId ?? db.patients.find((p) => p.id === d.patientIds[0])?.familyId ?? null;
  const turno = completar({
    id: ctx.nuevoId('t'), createdAt: ctx.ahora, createdBy: ctx.usuarioId, updatedAt: ctx.ahora, updatedBy: ctx.usuarioId,
    start: d.start, day: '', durationMin: d.durationMin, type: d.type, modality: d.modality, familyId: familia,
    patientIds: d.patientIds, address: d.address, zone: null, reason: d.reason.trim(), opsNotes: d.opsNotes.trim(),
    status: d.confirmar ? 'confirmado' : 'pendiente', origin: 'medico',
  }, db);
  const freno = revisar(db, null, turno, d.aceptarAvisos === true);
  if (freno) return { db, resultado: freno };
  return { db: guardar(db, ctx, null, turno, 'crear'), resultado: { estado: 'guardado', id: turno.id } };
}

export function accionTurnoDemo(db: Database, ctx: Contexto, p: PedidoAccionTurno): Salida {
  const actual = db.appointments.find((a) => a.id === p.turno.id);
  if (!actual) return { db, resultado: { estado: 'error', mensaje: 'No encontramos ese turno.' } };
  const accion: AccionTurno = p.accion;
  if (!accionPermitida(actual.status, accion)) {
    return { db, resultado: { estado: 'error', mensaje: `No se puede hacer eso con un turno ${TEXTO_ESTADO_TURNO[actual.status].toLowerCase()}.` } };
  }
  const motivo = p.motivo?.trim() ?? '';
  if (accion === 'cancelar' && !motivo) return { db, resultado: { estado: 'error', mensaje: 'Para cancelar, escribí el motivo.' } };
  const cambios = accion === 'editar' ? (p.cambios ?? {}) : {};
  const error = validar({ ...cambios, ...(accion === 'reprogramar' ? { start: p.start, durationMin: p.durationMin } : {}) });
  if (error) return { db, resultado: { estado: 'error', mensaje: error } };

  const despues: Appointment = { ...actual, ...cambios, status: estadoDespues(actual.status, accion), updatedAt: ctx.ahora, updatedBy: ctx.usuarioId };
  if (accion === 'reprogramar') {
    if (p.start) despues.start = p.start;
    if (p.durationMin) despues.durationMin = p.durationMin;
  }
  if (accion === 'cancelar') despues.cancelReason = motivo;
  if (accion === 'en_camino') despues.onTheWayAt = ctx.ahora;
  if (cambios.patientIds && !cambios.familyId) despues.familyId = db.patients.find((x) => x.id === cambios.patientIds![0])?.familyId ?? despues.familyId;
  if (despues.familyId && despues.porIdentificar) delete despues.porIdentificar;
  if (despues.type !== 'prenatal' && despues.patientIds.length === 0 && !despues.porIdentificar) {
    return { db, resultado: { estado: 'error', mensaje: 'Elegí al menos un paciente.' } };
  }
  const final = completar(despues, db);
  if (['confirmar', 'reprogramar', 'editar'].includes(accion)) {
    const freno = revisar(db, actual, final, p.aceptarAvisos === true);
    if (freno) return { db, resultado: freno };
  }
  return { db: guardar(db, ctx, actual, final, accion, motivo || undefined), resultado: { estado: 'guardado', id: actual.id } };
}

/** Pedidos sin confirmar que puede tener abiertos una familia (igual que en el servidor). */
export const PEDIDOS_ABIERTOS_MAXIMO = 3;

/**
 * Familia: pide una visita desde el portal. Queda como SOLICITUD (la confirma el Dr.), solo para
 * sus hijos y con tope de pedidos abiertos. Misma regla que `pedirVisita` del servidor.
 */
export function pedirVisitaDemo(db: Database, ctx: Contexto, guardianId: string, p: PedidoVisita): Salida {
  const error = (mensaje: string): Salida => ({ db, resultado: { estado: 'error', mensaje } });
  const hoy = ctx.ahora.slice(0, 10);
  const propios = new Set(db.relationships.filter((r) => r.guardianId === guardianId && !r.archivedAt && (!r.validTo || r.validTo > hoy)).map((r) => r.patientId));
  const ids = [...new Set(p.patientIds)];
  if (ids.length === 0) return error('Elegí para quién es la visita.');
  if (ids.some((x) => !propios.has(x))) return error('Solo podés pedir visitas para tus hijos.');
  const abiertos = db.appointments.filter((a) => a.createdBy === ctx.usuarioId && a.status === 'solicitado').length;
  if (abiertos >= PEDIDOS_ABIERTOS_MAXIMO) return error(`Ya tenés ${abiertos} pedidos sin confirmar. El Dr. te va a responder; si es urgente, escribile por PacienteX.`);
  let start = ctx.ahora;
  if (p.tipo === 'control') {
    const inicio = p.fecha && p.hora ? inicioDe(p.fecha, p.hora) : null;
    if (!inicio) return error('Elegí el día y la hora que prefieren.');
    if (Date.parse(inicio) < ctx.ahoraMs - 60_000) return error('Elegí un día de hoy en adelante.');
    start = inicio;
  }
  const h = Number(horaDe(start).slice(0, 2));
  const type = p.tipo === 'control' ? 'control' : h >= 20 || h < 8 ? 'urgencia-noche' : 'urgencia-dia';
  const dir = p.addressId ? db.addresses.find((a) => a.id === p.addressId && a.guardianId === guardianId) : undefined;
  const turno = completar({
    id: ctx.nuevoId('t'), createdAt: ctx.ahora, createdBy: ctx.usuarioId, updatedAt: ctx.ahora, updatedBy: ctx.usuarioId,
    start, day: '', durationMin: db.agenda.duracionMin[type], type, modality: 'domicilio',
    familyId: db.patients.find((x) => x.id === ids[0])?.familyId ?? null, patientIds: ids,
    address: dir ? { text: dir.street, locality: dir.locality, addressId: dir.id } : null, zone: null,
    reason: p.motivo.trim().slice(0, 200), opsNotes: '', status: 'solicitado', origin: 'portal',
  }, db);
  return { db: guardar(db, ctx, null, turno, 'solicitud'), resultado: { estado: 'guardado', id: turno.id } };
}
