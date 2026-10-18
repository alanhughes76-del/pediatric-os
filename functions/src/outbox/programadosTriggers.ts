/**
 * Avisos programados (prompt maestro 8.1): la lógica de plazos vive acá, no en Make.
 * - Cada hora: recordatorio 24 h antes de cada turno confirmado.
 * - Todos los días a las 8 (hora de Argentina): seguimientos vencidos, vacunas (solo con el calendario
 *   verificado), estudios para revisar, membresías por renovar, pagos vencidos y controles próximos.
 * Cada aviso sale una sola vez (clave única en la outbox). Trabaja sobre ORGANIZACION_ID.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { db, hoyArgentina } from '../config';
import { ORGANIZACION_ID } from '../params';
import { isoArgentina } from '../../../shared/fechaHora';
import { encolarEvento } from './encolar';
import type { TipoEvento } from './eventos';
import {
  avisosVacunas, controlesProximos, estudiosParaRevisar, membresiasPorRenovar, pagosVencidos, recordatorios24h, seguimientosVencidos, type Aviso,
} from './programados';

const ZONA = 'America/Argentina/Buenos_Aires';
type Datos = Record<string, unknown> & { id: string };

const filas = (snap: FirebaseFirestore.QuerySnapshot): Datos[] => snap.docs.map((d) => ({ ...d.data(), id: d.id }));
const delGrupo = async (org: string, grupo: string) => filas(await db().collectionGroup(grupo).where('organizationId', '==', org).get());

async function encolarTodos(org: string, tipo: TipoEvento, avisos: Aviso[]) {
  let n = 0;
  for (const a of avisos) if (await encolarEvento(org, tipo, a.data, { clave: a.clave })) n += 1;
  return n;
}

/** Exportadas para probarlas en el emulador sin esperar al reloj. */
export async function correrAvisosHorarios(org: string, ahoraMs = Date.now()) {
  const turnos = filas(await db().collection(`organizations/${org}/appointments`).where('status', '==', 'confirmado').get());
  return { 'turno.recordatorio_24h': await encolarTodos(org, 'turno.recordatorio_24h', recordatorios24h(turnos, ahoraMs)) };
}

export async function correrAvisosDiarios(org: string, hoy = hoyArgentina(), ahora = isoArgentina()) {
  const base = `organizations/${org}`;
  const [seguimientos, dosis, estudios, plan, membresias, pagos, vacunas] = await Promise.all([
    delGrupo(org, 'followUps'), delGrupo(org, 'vaccineDoses'), delGrupo(org, 'studyOrders'), delGrupo(org, 'carePlan'),
    db().collection(`${base}/memberships`).get().then(filas), db().collection(`${base}/payments`).get().then(filas),
    db().doc(`${base}/settings/vacunas`).get(),
  ]);
  const { proximas, atrasadas } = avisosVacunas(dosis, hoy, vacunas.data()?.calendarioVerificado === true);
  return {
    'seguimiento.vencido': await encolarTodos(org, 'seguimiento.vencido', seguimientosVencidos(seguimientos, ahora)),
    'vacuna.proxima': await encolarTodos(org, 'vacuna.proxima', proximas),
    'vacuna.atrasada': await encolarTodos(org, 'vacuna.atrasada', atrasadas),
    'estudio.revisar_resultado': await encolarTodos(org, 'estudio.revisar_resultado', estudiosParaRevisar(estudios, hoy)),
    'membresia.por_renovar': await encolarTodos(org, 'membresia.por_renovar', membresiasPorRenovar(membresias, hoy)),
    'pago.vencido': await encolarTodos(org, 'pago.vencido', pagosVencidos(membresias, pagos, hoy)),
    'control.proximo': await encolarTodos(org, 'control.proximo', controlesProximos(plan, hoy)),
  };
}

function organizacion() {
  const org = ORGANIZACION_ID.value();
  if (!org) logger.warn('Falta ORGANIZACION_ID: no se generan avisos programados.');
  return org;
}

export const avisosCadaHora = onSchedule({ schedule: 'every 60 minutes', timeZone: ZONA }, async () => {
  const org = organizacion();
  if (org) logger.info('Avisos horarios', await correrAvisosHorarios(org));
});

export const avisosDiarios = onSchedule({ schedule: 'every day 08:00', timeZone: ZONA }, async () => {
  const org = organizacion();
  if (org) logger.info('Avisos diarios', await correrAvisosDiarios(org));
});
