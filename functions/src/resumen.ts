/**
 * "Revisé y lo mando" (prompt maestro 7.5 y 8.1): el resumen para la familia de una nota
 * APROBADA sale hacia Make en el evento `resumen.envio_aprobado`, el único con texto clínico.
 * No hay envío sin la revisión del Dr.: solo él puede llamar a esta función.
 * Queda una comunicación registrada, sin el texto (la lee también el asistente).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, hoyArgentina } from './config';
import { exigirMedico, id, texto } from './permisos';
import { encolarEvento } from './outbox/encolar';
import { isoArgentina } from '../../shared/fechaHora';

export const enviarResumenFamilia = onCall<Record<string, unknown>>(async (req) => {
  const { uid, org } = exigirMedico(req);
  const d = req.data ?? {};
  const patientId = id(d.patientId, 'El paciente');
  const noteId = id(d.noteId, 'La nota');
  const asunto = texto(d.asunto, 'el asunto', 200);
  const cuerpo = texto(d.texto, 'el texto del mail', 5000);

  const base = `organizations/${org}`;
  const nota = (await db().doc(`${base}/clinical/${patientId}/notes/${noteId}`).get()).data();
  if (!nota) throw new HttpsError('not-found', 'No encontramos la nota.');
  if (nota.status !== 'aprobada') throw new HttpsError('failed-precondition', 'Solo se manda el resumen de una nota aprobada.');

  // Destinatarios: los adultos con vínculo vigente y email cargado.
  const hoy = hoyArgentina();
  const vinculos = await db().collection(`${base}/relationships`).where('patientId', '==', patientId).get();
  const vigentes = vinculos.docs.map((v) => v.data()).filter((v) => !v.archivedAt && (!v.validTo || v.validTo > hoy));
  const adultos = await Promise.all(vigentes.map((v) => db().doc(`${base}/guardians/${v.guardianId}`).get()));
  const destinatarios = adultos
    .filter((a) => a.exists && !a.data()?.archivedAt && typeof a.data()?.email === 'string' && a.data()!.email.trim())
    .map((a) => ({ guardianId: a.id, nombre: String(a.data()!.firstName ?? ''), email: String(a.data()!.email).trim() }));
  if (destinatarios.length === 0) throw new HttpsError('failed-precondition', 'Ningún adulto de este paciente tiene email cargado.');

  const paciente = (await db().doc(`${base}/patients/${patientId}`).get()).data();
  const ahora = isoArgentina();
  const ref = await db().collection(`${base}/communications`).add({
    organizationId: org, patientId, noteId, familyId: paciente?.familyId ?? null, kind: 'resumen_familia', channel: 'email', status: 'enviado_a_make',
    direction: 'saliente', classification: 'clinico', at: ahora, subject: 'Resumen de la visita',
    recipientIds: destinatarios.map((x) => x.guardianId), createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora,
  });
  await encolarEvento(org, 'resumen.envio_aprobado', {
    patientId, noteId, communicationId: ref.id, familyId: paciente?.familyId ?? null, destinatarios, asunto, texto: cuerpo,
  });
  return { ok: true, destinatarios: destinatarios.length };
});
