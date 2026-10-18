/**
 * Membresías y pagos (prompt maestro 7.16): lecturas para el módulo Membresías, la familia y los avisos.
 */
import type { Database, ID, Payment, PaymentMethod, Plan } from './types';
import { membresiaDeFamilia, type EstadoMembresia } from './selectores';

export const TEXTO_PLAN: Record<Plan, string> = { anual: 'Anual', semestral: 'Semestral' };
export const TEXTO_MEDIO: Record<PaymentMethod, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', mercadopago: 'Mercado Pago' };

/** La familia de un pago: la suya o la de su membresía (los pagos viejos solo tienen la membresía). */
export function familiaDePago(db: Database, p: Payment): ID | undefined {
  return p.familyId ?? db.memberships.find((m) => m.id === p.membershipId)?.familyId;
}

/** Pagos de una familia, del más nuevo al más viejo, sin los archivados. */
export function pagosDeFamilia(db: Database, familyId: ID): Payment[] {
  return db.payments
    .filter((p) => !p.archivedAt && familiaDePago(db, p) === familyId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** Pagos que cargó una automatización y falta confirmar (por ejemplo, desde el bot de Telegram). */
export function pagosAConfirmar(db: Database): Payment[] {
  return db.payments.filter((p) => !p.archivedAt && p.status === 'a_confirmar').sort((a, b) => a.date.localeCompare(b.date));
}

export interface FilaMembresia {
  familyId: ID;
  nombre: string;
  estado: EstadoMembresia;
  diasRestantes?: number;
}

/** Familias activas con su estado de membresía (las que nunca tuvieron, al final). */
export function filasMembresias(db: Database): FilaMembresia[] {
  const orden: Record<EstadoMembresia, number> = { vencida: 0, suspendida: 1, 'por-vencer': 2, activa: 3, cancelada: 4, 'sin-membresia': 5 };
  return db.families
    .filter((f) => !f.archivedAt && f.status !== 'inactiva')
    .map((f) => {
      const { estado, diasRestantes } = membresiaDeFamilia(db, f.id);
      return { familyId: f.id, nombre: f.name, estado, diasRestantes };
    })
    .sort((a, b) => orden[a.estado] - orden[b.estado] || (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0) || a.nombre.localeCompare(b.nombre));
}

/** Cuántas familias hay en cada estado. */
export function contarMembresias(filas: FilaMembresia[]): Record<EstadoMembresia, number> {
  const c: Record<EstadoMembresia, number> = { activa: 0, 'por-vencer': 0, vencida: 0, suspendida: 0, cancelada: 0, 'sin-membresia': 0 };
  for (const f of filas) c[f.estado] += 1;
  return c;
}
