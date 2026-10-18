/**
 * Envío de los eventos de la outbox al webhook único de Make ("Pediatric OS — eventos").
 * - Cada evento nuevo se intenta enviar enseguida.
 * - Si falla, se reintenta con espera creciente (cada 5 minutos se revisan los pendientes).
 * - Sin `MAKE_WEBHOOK_URL` configurada, el evento queda "sin_destino": no se simula ningún envío.
 * El secreto de la firma vive en Secret Manager (en el emulador, en functions/.secret.local).
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import type { DocumentReference } from 'firebase-admin/firestore';
import { ahoraISO, db } from '../config';
import { despuesDelIntento, enviarEvento } from './envio';

const MAKE_WEBHOOK_URL = defineString('MAKE_WEBHOOK_URL', { default: '' });
const MAKE_WEBHOOK_SECRET = defineSecret('MAKE_WEBHOOK_SECRET');

async function intentar(ref: DocumentReference) {
  const snap = await ref.get();
  const ev = snap.data();
  if (!ev || !['pendiente', 'reintentar'].includes(ev.status)) return;

  const url = MAKE_WEBHOOK_URL.value();
  if (!url) {
    await ref.update({ status: 'sin_destino', lastError: 'Falta configurar MAKE_WEBHOOK_URL', updatedAt: ahoraISO() });
    return;
  }
  const resultado = await enviarEvento(
    { id: ref.id, type: ev.type, occurredAt: ev.occurredAt, organizationId: ev.organizationId, audiencia: ev.audiencia, plantilla: ev.plantilla, data: ev.data ?? {} },
    { url, secreto: MAKE_WEBHOOK_SECRET.value() },
  );
  await ref.update({ ...despuesDelIntento(resultado, ev.attempts ?? 0, new Date()), updatedAt: ahoraISO() });
}

export const despacharEvento = onDocumentCreated(
  { document: 'organizations/{orgId}/outbox/{eventId}', secrets: [MAKE_WEBHOOK_SECRET] },
  async (event) => {
    if (event.data) await intentar(event.data.ref);
  },
);

export const reintentarEventos = onSchedule({ schedule: 'every 5 minutes', secrets: [MAKE_WEBHOOK_SECRET] }, async () => {
  const pendientes = await db()
    .collectionGroup('outbox')
    .where('status', '==', 'reintentar')
    .where('nextAttemptAt', '<=', ahoraISO())
    .limit(50)
    .get();
  for (const d of pendientes.docs) await intentar(d.ref);
});
