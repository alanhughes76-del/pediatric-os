/**
 * Nota clínica (prompt maestro 7.5): aprobar y corregir pasan por el servidor.
 * - aprobarNota: fija la versión con fecha, hora y autor; marca la consulta como realizada; si tiene
 *   bandera, crea o actualiza el seguimiento (24 h urgencias, 48 h el resto) y avisa a Make
 *   (`nota.aprobada` sin contenido clínico; `seguimiento.creado`).
 * - corregirNota: deja la aprobada como "reemplazada" y crea una versión nueva en borrador.
 * Las reglas no dejan hacer nada de esto desde la app: una nota aprobada es inmutable.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from './config';
import { exigirMedico, id } from './permisos';
import { encolarEvento } from './outbox/encolar';
import { isoArgentina } from '../../shared/fechaHora';
import { mensajeSeguimiento, vencimientoSeguimiento } from '../../shared/seguimiento';

interface CamposNota { findings?: string; plan?: string; familySummary?: string; allergiesMedication?: string; clinicalFlag?: boolean; origin?: string }

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export const aprobarNota = onCall<{ patientId?: string; noteId?: string; campos?: CamposNota }>(async (req) => {
  const { uid, org } = exigirMedico(req);
  const patientId = id(req.data?.patientId, 'El paciente');
  const noteId = id(req.data?.noteId, 'La nota');
  const c = req.data?.campos ?? {};
  const campos = {
    findings: str(c.findings), plan: str(c.plan), familySummary: str(c.familySummary),
    allergiesMedication: str(c.allergiesMedication), clinicalFlag: c.clinicalFlag === true,
    origin: c.origin === 'ia' ? 'ia' : 'humano',
  };
  if (!campos.findings.trim() && !campos.plan.trim() && !campos.familySummary.trim()) {
    throw new HttpsError('invalid-argument', 'La nota está vacía. Completá al menos un campo antes de aprobar.');
  }

  const notaRef = db().doc(`organizations/${org}/clinical/${patientId}/notes/${noteId}`);

  // Nombre del adulto principal, para el saludo del mensaje de seguimiento.
  const principal = await db().collection(`organizations/${org}/relationships`).where('patientId', '==', patientId).where('isPrimary', '==', true).limit(1).get();
  const guardianId = principal.docs[0]?.data().guardianId as string | undefined;
  const nombreAdulto = guardianId ? ((await db().doc(`organizations/${org}/guardians/${guardianId}`).get()).data()?.firstName as string | undefined) : undefined;

  const resultado = await db().runTransaction(async (tx) => {
    const nota = await tx.get(notaRef);
    if (!nota.exists) throw new HttpsError('not-found', 'No encontramos la nota.');
    const n = nota.data()!;
    if (n.status !== 'borrador') throw new HttpsError('failed-precondition', 'Esta nota ya no es un borrador.');
    const consultaRef = db().doc(`organizations/${org}/clinical/${patientId}/consultations/${n.consultationId}`);
    const consulta = await tx.get(consultaRef);
    if (!consulta.exists) throw new HttpsError('not-found', 'No encontramos la consulta.');
    const seguimientos = campos.clinicalFlag
      ? await tx.get(db().collection(`organizations/${org}/clinical/${patientId}/followUps`).where('consultationId', '==', n.consultationId).where('status', '==', 'pendiente'))
      : null;

    const ahora = isoArgentina();
    const firma = { updatedBy: uid, updatedAt: ahora };
    tx.update(notaRef, { ...campos, ...firma, status: 'aprobada', approvedAt: ahora, approvedBy: uid });
    tx.update(consultaRef, { status: 'realizada', ...firma });

    let seguimientoNuevo: string | null = null;
    if (campos.clinicalFlag) {
      const cons = consulta.data()!;
      const datos = {
        noteId,
        dueAt: vencimientoSeguimiento(cons.occurredAt, cons.visitType),
        message: mensajeSeguimiento({ nombreAdulto, resumenFamilia: campos.familySummary, conducta: campos.plan }),
      };
      const existente = seguimientos?.docs[0];
      if (existente) {
        tx.update(existente.ref, { ...datos, ...firma });
      } else {
        const ref = db().collection(`organizations/${org}/clinical/${patientId}/followUps`).doc();
        tx.set(ref, {
          ...datos, organizationId: org, patientId, consultationId: n.consultationId, status: 'pendiente',
          createdBy: uid, createdAt: ahora, ...firma,
        });
        seguimientoNuevo = ref.id;
      }
    }
    return { seguimientoNuevo };
  });

  await encolarEvento(org, 'nota.aprobada', { patientId, noteId });
  if (resultado.seguimientoNuevo) await encolarEvento(org, 'seguimiento.creado', { patientId, followUpId: resultado.seguimientoNuevo });
  return { ok: true, ...resultado };
});

export const corregirNota = onCall<{ patientId?: string; noteId?: string }>(async (req) => {
  const { uid, org } = exigirMedico(req);
  const patientId = id(req.data?.patientId, 'El paciente');
  const noteId = id(req.data?.noteId, 'La nota');
  const notas = db().collection(`organizations/${org}/clinical/${patientId}/notes`);

  return db().runTransaction(async (tx) => {
    const nota = await tx.get(notas.doc(noteId));
    if (!nota.exists) throw new HttpsError('not-found', 'No encontramos la nota.');
    const n = nota.data()!;
    if (n.status !== 'aprobada') throw new HttpsError('failed-precondition', 'Solo se corrige una nota aprobada.');
    const ahora = isoArgentina();
    const nueva = notas.doc();
    tx.update(nota.ref, { status: 'reemplazada', updatedBy: uid, updatedAt: ahora });
    tx.set(nueva, {
      organizationId: org, patientId, consultationId: n.consultationId,
      version: (n.version ?? 1) + 1, previousVersionId: noteId, status: 'borrador', origin: 'humano',
      findings: n.findings ?? '', plan: n.plan ?? '', familySummary: n.familySummary ?? '',
      allergiesMedication: n.allergiesMedication ?? '', clinicalFlag: n.clinicalFlag === true,
      createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora,
    });
    return { ok: true, id: nueva.id };
  });
});
