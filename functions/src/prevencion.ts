/**
 * Prevención (prompt maestro 7.12): "Enviar material" deja un material de la biblioteca del Dr.
 * disponible para la familia (portal, Etapa 6) y emite `material.enviado` para el aviso de Make.
 * Solo materiales que cargó el Dr.: nada se genera acá.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from './config';
import { exigirMedico, id } from './permisos';
import { encolarEvento } from './outbox/encolar';
import { isoArgentina } from '../../shared/fechaHora';

export const enviarMaterial = onCall<Record<string, unknown>>(async (req) => {
  const { uid, org } = exigirMedico(req);
  const materialId = id(req.data?.materialId, 'El material');
  const patientId = id(req.data?.patientId, 'El paciente');
  const base = `organizations/${org}`;
  const [material, paciente] = await Promise.all([
    db().doc(`${base}/educationalMaterials/${materialId}`).get(),
    db().doc(`${base}/patients/${patientId}`).get(),
  ]);
  if (!material.exists || material.data()?.archivedAt) throw new HttpsError('not-found', 'No encontramos ese material.');
  if (!paciente.exists) throw new HttpsError('not-found', 'No encontramos al paciente.');

  const ahora = isoArgentina();
  const ref = await db().collection(`${base}/materialDeliveries`).add({
    organizationId: org, patientId, materialId, sentAt: ahora, createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora,
  });
  // Solo identificadores y el título del material (no es clínico): Make arma el aviso.
  await encolarEvento(org, 'material.enviado', {
    deliveryId: ref.id, patientId, familyId: paciente.data()?.familyId ?? null, materialId, titulo: String(material.data()?.title ?? ''),
  });
  return { ok: true, id: ref.id };
});
