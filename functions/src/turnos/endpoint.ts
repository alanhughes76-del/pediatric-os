/**
 * Endpoint de Cal.com (transición): cada reserva entra como turno "solicitado" y la confirma el Dr.
 * - Valida la firma con `CALCOM_WEBHOOK_SECRET` (Secret Manager; en el emulador, functions/.secret.local).
 *   Sin secreto configurado, no acepta nada.
 * - Vincula al paciente por DNI cuando coincide; si no, el turno queda "familia por identificar".
 * - Es idempotente: el turno se llama `cal-{uid}`, así que una reserva repetida no duplica.
 * - No registra datos personales en los logs.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ORGANIZACION_ID } from '../params';
import { logger } from 'firebase-functions';
import { db } from '../config';
import { isoArgentina } from '../../../shared/fechaHora';
import { accionPermitida } from '../../../shared/agenda';
import { ENCABEZADO_CAL, firmaCalValida, leerReservaCal, type ReservaCal } from './calcom';
import { completar, type Turno } from './datos';
import { guardarTurno } from './operacion';

const CALCOM_WEBHOOK_SECRET = defineSecret('CALCOM_WEBHOOK_SECRET');
const SISTEMA = 'calcom';

async function registrarEntrada(org: string, tipo: string, resultado: string, appointmentId?: string) {
  await db().collection(`organizations/${org}/inbound`).add({
    organizationId: org, source: 'calcom', type: tipo, result: resultado, receivedAt: isoArgentina(), ...(appointmentId ? { appointmentId } : {}),
  });
}

/** Paciente con ese DNI, si hay uno solo. */
async function pacientePorDni(org: string, dni: string) {
  if (dni.length < 7) return null;
  const q = await db().collection(`organizations/${org}/patients`).where('dniDigits', '==', dni).limit(2).get();
  return q.size === 1 ? { id: q.docs[0].id, familyId: (q.docs[0].data().familyId as string | undefined) ?? null } : null;
}

async function crearSolicitud(org: string, r: ReservaCal) {
  const ref = db().doc(`organizations/${org}/appointments/cal-${r.uid}`);
  const previo = (await ref.get()).data() as Turno | undefined;
  if (previo) return { id: ref.id, vinculado: previo.patientIds.length > 0, estado: 'repetida' };
  const paciente = await pacientePorDni(org, r.dni);
  const res = await guardarTurno({
    org, uid: SISTEMA, ref, accion: 'solicitud', aceptarAvisos: true,
    armar: (actual, config) => {
      const ahora = isoArgentina();
      const turno: Turno = {
        organizationId: org,
        start: r.start,
        day: '',
        durationMin: r.durationMin,
        type: r.type,
        modality: 'domicilio',
        familyId: paciente?.familyId ?? null,
        patientIds: paciente ? [paciente.id] : [],
        address: r.address || r.locality ? { text: r.address, locality: r.locality } : null,
        zone: null,
        reason: r.reason,
        opsNotes: '',
        status: 'solicitado',
        origin: 'calcom',
        calBookingUid: r.uid,
        createdBy: SISTEMA,
        createdAt: ahora,
        updatedBy: SISTEMA,
        updatedAt: ahora,
        ...(paciente ? {} : { porIdentificar: { name: r.name, email: r.email, phone: r.phone, dni: r.dni } }),
      };
      return completar(turno, config);
    },
  });
  return { id: ref.id, vinculado: !!paciente, estado: res.estado };
}

async function cancelarReserva(org: string, uid: string, motivo: string) {
  const ref = db().doc(`organizations/${org}/appointments/cal-${uid}`);
  const snap = await ref.get();
  const t = snap.data() as Turno | undefined;
  if (!t || !accionPermitida(t.status, 'cancelar')) return null;
  await guardarTurno({
    org, uid: SISTEMA, ref, accion: 'cancelar', motivo,
    armar: (actual) => ({ ...actual!, status: 'cancelado', cancelReason: motivo, updatedBy: SISTEMA, updatedAt: isoArgentina() }),
  });
  return ref.id;
}

export const reservaCalcom = onRequest({ secrets: [CALCOM_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Solo POST'); return; }
  const org = ORGANIZACION_ID.value();
  const secreto = CALCOM_WEBHOOK_SECRET.value();
  if (!org || !secreto) { res.status(503).send('Falta configurar el endpoint'); return; }
  if (!firmaCalValida(req.rawBody, secreto, req.get(ENCABEZADO_CAL))) { res.status(401).send('Firma inválida'); return; }

  const r = leerReservaCal(req.body);
  if (!r) { await registrarEntrada(org, 'invalida', 'rechazada'); res.status(400).send('Reserva incompleta'); return; }

  try {
    if (r.evento === 'creada' || r.evento === 'reprogramada') {
      if (r.evento === 'reprogramada' && r.anteriorUid) await cancelarReserva(org, r.anteriorUid, 'Reprogramado en Cal.com');
      const s = await crearSolicitud(org, r);
      await registrarEntrada(org, r.evento, s.vinculado ? 'solicitud_vinculada' : 'solicitud_por_identificar', s.id);
      logger.info('Reserva de Cal.com recibida', { appointmentId: s.id, vinculada: s.vinculado });
      res.status(200).json({ ok: true, appointmentId: s.id });
      return;
    }
    if (r.evento === 'cancelada') {
      const id = await cancelarReserva(org, r.uid, 'Cancelado en Cal.com');
      await registrarEntrada(org, r.evento, id ? 'cancelado' : 'sin_cambios', id ?? undefined);
      res.status(200).json({ ok: true });
      return;
    }
    await registrarEntrada(org, 'otra', 'ignorada');
    res.status(200).json({ ok: true, ignorada: true });
  } catch (e) {
    logger.error('No se pudo procesar la reserva de Cal.com', { error: e instanceof Error ? e.message : String(e) });
    res.status(500).send('Error');
  }
});
