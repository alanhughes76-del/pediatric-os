/**
 * Certificados (prompt maestro 7.11): emitir y anular pasan por el servidor.
 * Un certificado emitido no se edita: se anula con motivo y se emite otro.
 * Al emitir se registra también el documento del paciente y se avisa a Make
 * (`certificado.emitido`, solo con identificadores; el PDF se adjunta por mail en la Etapa 8).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from './config';
import { exigirMedico, id, texto } from './permisos';
import { encolarEvento } from './outbox/encolar';
import { isoArgentina } from '../../shared/fechaHora';
import { getStorage } from 'firebase-admin/storage';
import { pdfCertificado } from './certificadoPdf';

const TIPOS = ['aptitud-fisica', 'control-salud', 'buena-salud', 'constancia-atencion', 'libre'];
const TITULOS: Record<string, string> = {
  'aptitud-fisica': 'Certificado de aptitud física',
  'control-salud': 'Constancia de control de salud',
  'buena-salud': 'Certificado de buena salud',
  'constancia-atencion': 'Constancia de atención',
  libre: 'Certificado',
};
/** Firma tipográfica por defecto (la firma digital real llega en otra etapa). */
const FIRMA = 'Dr. Alan Hughes · Médico Pediatra · MN 111.725 · MP 448.970';

export const emitirCertificado = onCall<Record<string, unknown>>(async (req) => {
  const { uid, org } = exigirMedico(req);
  const d = req.data ?? {};
  const patientId = id(d.patientId, 'El paciente');
  const type = String(d.type ?? '');
  if (!TIPOS.includes(type)) throw new HttpsError('invalid-argument', 'El tipo de certificado no es válido.');
  const date = String(d.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpsError('invalid-argument', 'Revisá la fecha.');
  const body = texto(d.body, 'el texto del certificado');
  const requestedBy = typeof d.requestedBy === 'string' ? d.requestedBy.trim() : '';
  const destination = typeof d.destination === 'string' ? d.destination.trim() : '';
  const place = typeof d.place === 'string' && d.place.trim() ? d.place.trim() : 'Buenos Aires';

  const paciente = await db().doc(`organizations/${org}/patients/${patientId}`).get();
  if (!paciente.exists) throw new HttpsError('not-found', 'No encontramos al paciente.');
  const firmaProfesional = (await db().collection(`organizations/${org}/professionals`).limit(1).get()).docs[0]?.data().signature;

  const raiz = `organizations/${org}/clinical/${patientId}`;
  const certRef = db().collection(`${raiz}/certificates`).doc();
  const docRef = db().collection(`${raiz}/documents`).doc();
  const ahora = isoArgentina();
  const firmaTexto = typeof firmaProfesional === 'string' ? firmaProfesional : FIRMA;

  // El PDF se arma y se guarda antes de registrar el certificado: si no se pudo guardar, no se emite.
  const archivo = `orgs/${org}/patients/${patientId}/certificados/${certRef.id}.pdf`;
  const pdf = await pdfCertificado({ titulo: TITULOS[type], cuerpo: body, lugar: place, fecha: date, firma: firmaTexto });
  await getStorage().bucket().file(archivo).save(Buffer.from(pdf), { contentType: 'application/pdf', resumable: false });
  const firma = { organizationId: org, patientId, createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora };
  const batch = db().batch();
  batch.set(certRef, {
    ...firma, type, body, requestedBy, destination, place, date,
    signature: firmaTexto, status: 'emitido', documentId: docRef.id,
  });
  batch.set(docRef, { ...firma, title: TITULOS[type], date, file: archivo, certificateId: certRef.id, kind: 'certificado', origin: 'sistema', mimeType: 'application/pdf', visibleToFamily: true });
  await batch.commit();
  await encolarEvento(org, 'certificado.emitido', { patientId, certificateId: certRef.id });
  return { ok: true, id: certRef.id };
});

export const anularCertificado = onCall<{ patientId?: string; certificateId?: string; reason?: string }>(async (req) => {
  const { uid, org } = exigirMedico(req);
  const patientId = id(req.data?.patientId, 'El paciente');
  const certificateId = id(req.data?.certificateId, 'El certificado');
  const reason = texto(req.data?.reason, 'el motivo de la anulación', 1000);
  const ref = db().doc(`organizations/${org}/clinical/${patientId}/certificates/${certificateId}`);
  await db().runTransaction(async (tx) => {
    const c = await tx.get(ref);
    if (!c.exists) throw new HttpsError('not-found', 'No encontramos el certificado.');
    if (c.data()!.status !== 'emitido') throw new HttpsError('failed-precondition', 'Este certificado ya está anulado.');
    const ahora = isoArgentina();
    tx.update(ref, { status: 'anulado', voidReason: reason, voidedAt: ahora, updatedBy: uid, updatedAt: ahora });
  });
  return { ok: true };
});
