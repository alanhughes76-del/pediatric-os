/**
 * Auditoría del lado del servidor: cada alta, cambio, archivado o borrado de un documento
 * relevante suma una fila en `organizations/{orgId}/auditLog`. Como la escribe el servidor,
 * no se puede saltear desde la interfaz; las reglas no dejan modificarla ni borrarla.
 */
import { onDocumentWritten, type Change, type FirestoreEvent, type DocumentSnapshot } from 'firebase-functions/v2/firestore';
import { ahoraISO, db } from '../config';
import { armarEntrada } from './armar';

/** Colecciones que no se auditan: son la propia trazabilidad o datos derivados que arma el servidor. */
const NO_AUDITAR = new Set(['auditLog', 'outbox', 'inbound', 'notifications', 'aiInteractions', 'portalAccess', 'agendaDays']);

type Evento = FirestoreEvent<Change<DocumentSnapshot> | undefined, Record<string, string>>;

async function registrar(event: Evento, orgId: string, path: string, entity: string, entityId: string, patientId?: string) {
  const entrada = armarEntrada({
    antes: event.data?.before.data(),
    despues: event.data?.after.data(),
    path,
    entity,
    entityId,
    patientId,
    ahora: ahoraISO(),
  });
  if (entrada) await db().collection(`organizations/${orgId}/auditLog`).add(entrada);
}

export const auditarAdministrativo = onDocumentWritten('organizations/{orgId}/{coleccion}/{docId}', async (event) => {
  const { orgId, coleccion, docId } = event.params;
  if (NO_AUDITAR.has(coleccion)) return;
  await registrar(event, orgId, `${coleccion}/${docId}`, coleccion, docId, coleccion === 'patients' ? docId : undefined);
});

export const auditarClinico = onDocumentWritten('organizations/{orgId}/clinical/{patientId}/{sub}/{docId}', async (event) => {
  const { orgId, patientId, sub, docId } = event.params;
  await registrar(event, orgId, `clinical/${patientId}/${sub}/${docId}`, sub, docId, patientId);
});

export const auditarDomicilios = onDocumentWritten('organizations/{orgId}/guardians/{guardianId}/addresses/{addressId}', async (event) => {
  const { orgId, guardianId, addressId } = event.params;
  await registrar(event, orgId, `guardians/${guardianId}/addresses/${addressId}`, 'addresses', addressId);
});
