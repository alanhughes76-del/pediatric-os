/**
 * IA Asistente (prompt maestro 7.18), solo para el médico.
 * - iaAsistente: corre una acción. Exige la IA encendida (settings/ia, la enciende el Dr. después de
 *   revisar el consentimiento) y la clave ANTHROPIC_API_KEY en el servidor. Si la familia revocó el
 *   consentimiento de IA, no se usa con ese paciente.
 * - iaDecision: el Dr. acepta o descarta la propuesta.
 * Cada uso queda en aiInteractions (solo el médico) y en la auditoría: qué acción, de qué paciente,
 * cuándo y si se aceptó. Nada de lo que propone la IA entra a la historia sin que el Dr. lo guarde.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { db, hoyArgentina } from '../config';
import { exigirMedico, id } from '../permisos';
import { isoArgentina } from '../../../shared/fechaHora';
import { esAccionIA } from './acciones';
import { ejecutarAccion } from './ejecutar';
import { MODELO_IA, modeloClaude } from './modelo';
import type { DatosPaciente } from './contexto';

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
type Datos = Record<string, unknown>;

const filas = async (ruta: string) => (await db().collection(ruta).get()).docs.map((d) => ({ ...d.data(), id: d.id }) as Datos);

/** ¿Algún adulto de este paciente revocó el consentimiento para usar IA? */
async function consentimientoRevocado(org: string, patientId: string): Promise<boolean> {
  const base = `organizations/${org}`;
  const vinculos = await db().collection(`${base}/relationships`).where('patientId', '==', patientId).get();
  const uids: string[] = [];
  for (const v of vinculos.docs) {
    const g = (await db().doc(`${base}/guardians/${v.data().guardianId}`).get()).data();
    if (typeof g?.authUid === 'string') uids.push(g.authUid);
  }
  if (uids.length === 0) return false;
  const consentimientos = await db().collection(`${base}/consents`).where('kind', '==', 'ia').get();
  return consentimientos.docs.some((c) => uids.includes(c.data().guardianUid) && !!c.data().revokedAt);
}

async function cargarDatos(org: string, patientId: string): Promise<DatosPaciente & { materiales: Datos[] }> {
  const base = `organizations/${org}`;
  const c = `${base}/clinical/${patientId}`;
  const paciente = (await db().doc(`${base}/patients/${patientId}`).get()).data();
  if (!paciente) throw new HttpsError('not-found', 'No encontramos al paciente.');
  const [antecedentes, problemas, alergias, medicacion, consultas, notas, mediciones, vacunas, estudios, plan, materiales] = await Promise.all([
    filas(`${c}/background`), filas(`${c}/problems`), filas(`${c}/allergies`), filas(`${c}/medications`), filas(`${c}/consultations`),
    filas(`${c}/notes`), filas(`${c}/growth`), filas(`${c}/vaccineDoses`), filas(`${c}/studyOrders`), filas(`${c}/carePlan`),
    filas(`${base}/educationalMaterials`),
  ]);
  return { paciente, antecedentes: antecedentes[0], problemas, alergias, medicacion, consultas, notas, mediciones, vacunas, estudios, plan, materiales };
}

export const iaAsistente = onCall({ secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300 }, async (req) => {
  const { uid, org } = exigirMedico(req);
  const d = req.data ?? {};
  if (!esAccionIA(d.accion)) throw new HttpsError('invalid-argument', 'La acción no es válida.');
  const patientId = id(d.patientId, 'El paciente');
  const base = `organizations/${org}`;

  const ajustes = (await db().doc(`${base}/settings/ia`).get()).data();
  if (ajustes?.enabled !== true) throw new HttpsError('failed-precondition', 'La IA está apagada. Se enciende en Configuración, después de revisar el consentimiento.');
  const clave = ANTHROPIC_API_KEY.value();
  if (!clave) throw new HttpsError('failed-precondition', 'Falta configurar la clave de la IA en el servidor.');
  if (await consentimientoRevocado(org, patientId)) throw new HttpsError('failed-precondition', 'La familia de este paciente no dio su consentimiento para usar IA.');

  const datos = await cargarDatos(org, patientId);
  let consulta: Datos | undefined;
  if (d.accion === 'preparar_evolucion') {
    const consultationId = id(d.consultationId, 'La consulta');
    consulta = datos.consultas?.find((x) => x.id === consultationId);
    if (!consulta) throw new HttpsError('not-found', 'No encontramos la consulta.');
    // El texto que el Dr. tiene en pantalla (el guardado automático puede ir unos segundos atrás).
    if (typeof d.texto === 'string') consulta = { ...consulta, rawText: d.texto.slice(0, 20_000) };
  }

  const r = await ejecutarAccion({ accion: d.accion, consulta, pregunta: typeof d.pregunta === 'string' ? d.pregunta.slice(0, 1000) : undefined }, datos, modeloClaude(clave), hoyArgentina());
  if (r.estado === 'sin_datos') throw new HttpsError('invalid-argument', r.error ?? 'Faltan datos.');

  const ahora = isoArgentina();
  const ref = await db().collection(`${base}/aiInteractions`).add({
    organizationId: org, action: d.accion, patientId, consultationId: consulta?.id ?? null, uid, createdAt: ahora,
    model: r.modelo ?? MODELO_IA, status: r.estado, resultado: r.resultado ?? null,
    tokensEntrada: r.tokensEntrada ?? null, tokensSalida: r.tokensSalida ?? null, aceptado: null, decididoAt: null,
  });
  await db().collection(`${base}/auditLog`).add({
    at: ahora, actorId: uid, actorType: 'ia', action: `ia.${d.accion}`, entity: 'aiInteractions', entityId: ref.id, patientId, detail: r.estado,
  });
  logger.info('IA Asistente', { accion: d.accion, estado: r.estado });
  if (r.estado !== 'ok') throw new HttpsError('unavailable', r.error ?? 'La IA no pudo responder.');
  return { interaccionId: ref.id, resultado: r.resultado };
});

export const iaDecision = onCall(async (req) => {
  const { uid, org } = exigirMedico(req);
  const interaccionId = id(req.data?.interaccionId, 'La propuesta');
  if (typeof req.data?.aceptado !== 'boolean') throw new HttpsError('invalid-argument', 'Falta si la aceptaste.');
  const ref = db().doc(`organizations/${org}/aiInteractions/${interaccionId}`);
  const actual = (await ref.get()).data();
  if (!actual) throw new HttpsError('not-found', 'No encontramos la propuesta.');
  const ahora = isoArgentina();
  await ref.update({ aceptado: req.data.aceptado, decididoAt: ahora });
  await db().collection(`organizations/${org}/auditLog`).add({
    at: ahora, actorId: uid, actorType: 'persona', action: req.data.aceptado ? 'ia.aceptar' : 'ia.descartar', entity: 'aiInteractions', entityId: interaccionId, patientId: actual.patientId,
  });
  return { ok: true };
});
