/**
 * Encolar un evento para Make. Toda función del servidor que quiera avisar algo afuera llama acá;
 * el envío lo hace `despacharEvento` (outbox/triggers.ts).
 */
import { ahoraISO, db } from '../config';
import type { TipoEvento } from './eventos';

export async function encolarEvento(orgId: string, type: TipoEvento, data: Record<string, unknown>) {
  const ahora = ahoraISO();
  const ref = await db().collection(`organizations/${orgId}/outbox`).add({
    type,
    data,
    organizationId: orgId,
    occurredAt: ahora,
    status: 'pendiente',
    attempts: 0,
    nextAttemptAt: ahora,
    createdAt: ahora,
  });
  return ref.id;
}
