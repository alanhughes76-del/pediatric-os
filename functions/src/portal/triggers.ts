/**
 * Mantiene las copias del portal (`organizations/{org}/portal/{paciente}/{sub}/{id}`): cada vez que
 * cambia un dato de origen, se recalcula su copia con `proyeccion.ts` (o se borra si ya no va).
 * La familia lee SOLO estas copias; los originales clínicos no los puede leer (reglas).
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from '../config';
import { isoArgentina } from '../../../shared/fechaHora';
import { DESTINO, proyectarClinico, proyectarFamilia, proyectarPaciente, proyectarTurno } from './proyeccion';

type Datos = Record<string, unknown>;

const rutaPortal = (org: string, patientId: string, sub: string, id: string) => `organizations/${org}/portal/${patientId}/${sub}/${id}`;

/**
 * Escribe la copia, o la borra si ya no corresponde. La copia es del servidor: borrarla no borra nada clínico.
 * Sin `organizationId` a propósito: el médico lee lo clínico por grupo de colecciones filtrando por ese
 * campo, y las copias (mismos nombres: fever, allergies…) no deben mezclarse con los originales.
 */
async function guardarCopia(org: string, patientId: string, sub: string, id: string, copia: Datos | null) {
  const ref = db().doc(rutaPortal(org, patientId, sub, id));
  if (copia) await ref.set({ ...copia, patientId, updatedAt: isoArgentina() });
  else await ref.delete();
}

async function calendarioVerificado(org: string) {
  return (await db().doc(`organizations/${org}/settings/vacunas`).get()).data()?.calendarioVerificado === true;
}

export async function copiarClinico(org: string, patientId: string, sub: string, id: string, d: Datos | undefined) {
  const destino = DESTINO[sub];
  if (!destino) return;
  const consulta = sub === 'notes' && typeof d?.consultationId === 'string'
    ? (await db().doc(`organizations/${org}/clinical/${patientId}/consultations/${d.consultationId}`).get()).data()
    : undefined;
  const verificado = sub === 'vaccineDoses' ? await calendarioVerificado(org) : false;
  await guardarCopia(org, patientId, destino, id, proyectarClinico(sub, d, { calendarioVerificado: verificado, consulta }));
}

export const portalClinico = onDocumentWritten('organizations/{orgId}/clinical/{patientId}/{sub}/{docId}', async (event) => {
  const { orgId, patientId, sub, docId } = event.params;
  await copiarClinico(orgId, patientId, sub, docId, event.data?.after.data());
});

/** Familia y membresía de un chico (para el saludo y el banner). */
async function copiarFamilia(org: string, patientId: string, familyId: string | undefined) {
  if (!familyId) return guardarCopia(org, patientId, 'datos', 'familia', proyectarFamilia(undefined, undefined));
  const base = `organizations/${org}`;
  const [familia, membresias] = await Promise.all([
    db().doc(`${base}/families/${familyId}`).get(),
    db().collection(`${base}/memberships`).where('familyId', '==', familyId).get(),
  ]);
  const vigente = membresias.docs.map((m) => m.data()).filter((m) => !m.archivedAt).sort((a, b) => String(b.renewalDate).localeCompare(String(a.renewalDate)))[0];
  await guardarCopia(org, patientId, 'datos', 'familia', proyectarFamilia(familia.data(), vigente));
}

async function copiarFamiliaDe(org: string, familyId: string) {
  const chicos = await db().collection(`organizations/${org}/patients`).where('familyId', '==', familyId).get();
  for (const c of chicos.docs) await copiarFamilia(org, c.id, familyId);
}

export const portalPaciente = onDocumentWritten('organizations/{orgId}/patients/{patientId}', async (event) => {
  const { orgId, patientId } = event.params;
  const d = event.data?.after.data();
  await guardarCopia(orgId, patientId, 'datos', 'paciente', proyectarPaciente(d));
  await copiarFamilia(orgId, patientId, typeof d?.familyId === 'string' ? d.familyId : undefined);
});

export const portalFamilia = onDocumentWritten('organizations/{orgId}/families/{familyId}', async (event) => {
  await copiarFamiliaDe(event.params.orgId, event.params.familyId);
});

export const portalMembresia = onDocumentWritten('organizations/{orgId}/memberships/{id}', async (event) => {
  const ids = new Set([event.data?.before.data()?.familyId, event.data?.after.data()?.familyId].filter((x): x is string => typeof x === 'string'));
  for (const f of ids) await copiarFamiliaDe(event.params.orgId, f);
});

export const portalTurno = onDocumentWritten('organizations/{orgId}/appointments/{id}', async (event) => {
  const { orgId, id } = event.params;
  const antes = (event.data?.before.data()?.patientIds ?? []) as string[];
  const despues = event.data?.after.data();
  const ahora = (despues?.patientIds ?? []) as string[];
  const copia = proyectarTurno(despues);
  for (const p of new Set([...antes, ...ahora])) await guardarCopia(orgId, p, 'turnos', id, ahora.includes(p) ? copia : null);
});

/** Si cambia la verificación del calendario, se rehacen las copias de las vacunas pendientes. */
export const portalCalendario = onDocumentWritten('organizations/{orgId}/settings/{docId}', async (event) => {
  if (event.params.docId !== 'vacunas') return;
  const antes = event.data?.before.data()?.calendarioVerificado === true;
  const despues = event.data?.after.data()?.calendarioVerificado === true;
  if (antes === despues) return;
  const { orgId } = event.params;
  const dosis = await db().collectionGroup('vaccineDoses').where('organizationId', '==', orgId).where('status', '==', 'pendiente').get();
  for (const d of dosis.docs) {
    const patientId = d.ref.parent.parent!.id;
    await guardarCopia(orgId, patientId, 'vaccines', d.id, proyectarClinico('vaccineDoses', d.data(), { calendarioVerificado: despues }));
  }
});
