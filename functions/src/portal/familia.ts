/**
 * Lo que hace la familia desde el portal (prompt maestro 7.19), siempre validado en el servidor.
 *
 * pedirVisita — crea una SOLICITUD en la agenda (estado "solicitado", origen portal). No es una
 *   confirmación: la confirma el Dr. Solo para sus hijos (portalAccess) y con un tope de pedidos abiertos.
 * (La descarga de documentos y materiales desde el portal se anuló a pedido del Dr., 17/10/2026: las
 *  comunicaciones a las familias las va a manejar un agente aparte.)
 * avisoDatosFamilia / avisoDireccionFamilia — si la familia cambia su teléfono, email, preferencia
 *   o direcciones, le llega un aviso al Dr. y sale `familia.datos_actualizados` (solo qué cambió).
 */
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from '../config';
import { exigirRol, id } from '../permisos';
import { encolarEvento } from '../outbox/encolar';
import { isoArgentina } from '../../../shared/fechaHora';
import { diaDe, horaDe, inicioDe, msDe } from '../../../shared/agenda';
import { completar, type Turno } from '../turnos/datos';
import { guardarTurno } from '../turnos/operacion';

export const PEDIDOS_ABIERTOS_MAXIMO = 3;
const DIA_MS = 24 * 3_600_000;

/** El adulto y los chicos que puede ver (lo mantiene el servidor en portalAccess). */
async function accesoDe(req: CallableRequest<unknown>) {
  const { uid, org } = exigirRol(req, ['familia']);
  const acceso = (await db().doc(`organizations/${org}/portalAccess/${uid}`).get()).data();
  if (!acceso?.enabled || typeof acceso.guardianId !== 'string') throw new HttpsError('permission-denied', 'Tu acceso al portal no está habilitado.');
  return { uid, org, guardianId: acceso.guardianId as string, patientIds: (acceso.patientIds ?? []) as string[] };
}

export const pedirVisita = onCall<Record<string, unknown>>(async (req) => {
  const { uid, org, guardianId, patientIds: propios } = await accesoDe(req);
  const d = req.data ?? {};
  const ids = Array.isArray(d.patientIds) ? [...new Set(d.patientIds.map((x) => id(x, 'El paciente')))] : [];
  if (ids.length === 0 || ids.length > 6) throw new HttpsError('invalid-argument', 'Elegí para quién es la visita.');
  if (ids.some((p) => !propios.includes(p))) throw new HttpsError('permission-denied', 'Solo podés pedir visitas para tus hijos.');
  const tipo = d.tipo === 'urgencia' ? 'urgencia' : d.tipo === 'control' ? 'control' : null;
  if (!tipo) throw new HttpsError('invalid-argument', 'Elegí el tipo de visita.');
  const motivo = typeof d.motivo === 'string' ? d.motivo.trim().slice(0, 200) : '';
  const base = `organizations/${org}`;

  // Tope de pedidos sin confirmar, para que nadie llene la agenda.
  const abiertos = (await db().collection(`${base}/appointments`).where('createdBy', '==', uid).get()).docs
    .filter((x) => x.data().status === 'solicitado').length;
  if (abiertos >= PEDIDOS_ABIERTOS_MAXIMO) {
    throw new HttpsError('resource-exhausted', `Ya tenés ${abiertos} pedidos sin confirmar. El Dr. te va a responder; si es urgente, escribile por PacienteX.`);
  }

  // Horario: la urgencia es para ahora; el control, para el día y la hora que prefieren.
  const ahora = Date.now();
  let start: string;
  if (tipo === 'urgencia') start = isoArgentina(ahora);
  else {
    const inicio = typeof d.fecha === 'string' && typeof d.hora === 'string' ? inicioDe(d.fecha, d.hora) : null;
    if (!inicio) throw new HttpsError('invalid-argument', 'Elegí el día y la hora que prefieren.');
    const ms = msDe(inicio);
    if (ms < ahora - 60_000 || ms > ahora + 120 * DIA_MS) throw new HttpsError('invalid-argument', 'Elegí un día de hoy en adelante, dentro de los próximos 4 meses.');
    start = inicio;
  }
  const hora = Number(horaDe(start).slice(0, 2));
  const type = tipo === 'control' ? 'control' : hora >= 20 || hora < 8 ? 'urgencia-noche' : 'urgencia-dia';

  // Dirección: una de las suyas (copia; no cambia la guardada).
  let address: Turno['address'] = null;
  if (typeof d.addressId === 'string' && d.addressId) {
    const dir = (await db().doc(`${base}/guardians/${guardianId}/addresses/${id(d.addressId, 'La dirección')}`).get()).data();
    if (!dir || dir.archivedAt) throw new HttpsError('not-found', 'No encontramos esa dirección.');
    address = { text: String(dir.street ?? ''), locality: String(dir.locality ?? ''), addressId: d.addressId };
  }
  const paciente = (await db().doc(`${base}/patients/${ids[0]}`).get()).data();
  const ref = db().collection(`${base}/appointments`).doc();
  const ahoraIso = isoArgentina(ahora);
  await guardarTurno({
    org, uid, ref, accion: 'solicitud', aceptarAvisos: true,
    armar: (_actual, config) => completar({
      organizationId: org, start, day: diaDe(start), durationMin: config.duracionMin[type], type, modality: 'domicilio',
      familyId: typeof paciente?.familyId === 'string' ? paciente.familyId : null, patientIds: ids, address, zone: null,
      reason: motivo, opsNotes: '', status: 'solicitado', origin: 'portal',
      createdBy: uid, createdAt: ahoraIso, updatedBy: uid, updatedAt: ahoraIso,
    }, config),
  });
  return { ok: true, id: ref.id };
});

const CAMPOS_CONTACTO = ['phone', 'email', 'contactPreference'];

/** Aviso al Dr. (campana) y evento para Make: solo qué cambió, nunca los datos. */
async function avisar(org: string, guardianId: string, campos: string[]) {
  const adulto = (await db().doc(`organizations/${org}/guardians/${guardianId}`).get()).data();
  const ahora = isoArgentina();
  const medicos = await db().collection(`organizations/${org}/professionals`).get();
  for (const m of medicos.docs) {
    await db().collection(`organizations/${org}/notifications`).add({
      organizationId: org, recipientUid: m.id, kind: 'datos_familia', guardianId, campos, createdAt: ahora, readAt: null,
      titulo: `${String(adulto?.firstName ?? '')} ${String(adulto?.lastName ?? '')}`.trim() || 'Un adulto',
    });
  }
  await encolarEvento(org, 'familia.datos_actualizados', { guardianId, familyId: adulto?.familyId ?? null, campos });
}

export const avisoDatosFamilia = onDocumentUpdated('organizations/{orgId}/guardians/{guardianId}', async (event) => {
  const antes = event.data?.before.data() ?? {};
  const despues = event.data?.after.data() ?? {};
  // Solo los cambios que hizo la propia familia (el Dr. no se avisa a sí mismo).
  if (!despues.authUid || despues.updatedBy !== despues.authUid) return;
  const campos = CAMPOS_CONTACTO.filter((c) => JSON.stringify(antes[c]) !== JSON.stringify(despues[c]));
  if (campos.length > 0) await avisar(event.params.orgId, event.params.guardianId, campos);
});

export const avisoDireccionFamilia = onDocumentWritten('organizations/{orgId}/guardians/{guardianId}/addresses/{addressId}', async (event) => {
  const despues = event.data?.after.data();
  if (!despues) return;
  const adulto = (await db().doc(`organizations/${event.params.orgId}/guardians/${event.params.guardianId}`).get()).data();
  if (!adulto?.authUid || despues.updatedBy !== adulto.authUid) return;
  await avisar(event.params.orgId, event.params.guardianId, ['direccion']);
});
