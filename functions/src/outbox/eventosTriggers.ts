/**
 * Eventos que salen de cambios en la base (sin pasar por una función del servidor):
 * alta de una familia, bienvenida de una membresía nueva y fiebre anotada por la familia.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { db } from '../config';
import { encolarEvento } from './encolar';

export const eventoFamiliaCreada = onDocumentCreated('organizations/{orgId}/families/{familyId}', async (event) => {
  const f = event.data?.data();
  if (!f) return;
  await encolarEvento(event.params.orgId, 'familia.creada', { familyId: event.params.familyId, nombre: String(f.name ?? ''), zona: f.zone ?? null });
});

/** Bienvenida: la primera membresía activa de la familia (una renovación no vuelve a dar la bienvenida). */
export const eventoMembresiaAlta = onDocumentCreated('organizations/{orgId}/memberships/{id}', async (event) => {
  const m = event.data?.data();
  if (!m || m.status !== 'activa' || typeof m.familyId !== 'string') return;
  const otras = await db().collection(`organizations/${event.params.orgId}/memberships`).where('familyId', '==', m.familyId).get();
  if (otras.docs.some((d) => d.id !== event.params.id)) return;
  await encolarEvento(event.params.orgId, 'membresia.alta', {
    membershipId: event.params.id, familyId: m.familyId, patientIds: Array.isArray(m.patientIds) ? m.patientIds : [],
    plan: m.plan ?? null, renewalDate: m.renewalDate ?? null,
  }, { clave: event.params.id });
});

/** Aviso al Dr. cuando la familia anota algo en el registro de fiebre. Sin la temperatura: el detalle lo ve en la app. */
export const eventoFiebreNueva = onDocumentCreated('organizations/{orgId}/clinical/{patientId}/fever/{id}', async (event) => {
  const f = event.data?.data();
  if (!f || f.origin !== 'familia') return;
  await encolarEvento(event.params.orgId, 'fiebre.registro_nuevo', { patientId: event.params.patientId, feverId: event.params.id, tipo: f.kind ?? null, at: f.at ?? null });
});
