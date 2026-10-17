/**
 * Plan de cuidado agrupado por plazo, para el tablero de la ficha:
 * - Hoy: pendientes con fecha de hoy o anterior (incluye vencidos).
 * - Próximos 30 días: fecha entre mañana y hoy + 30.
 * - Próximos meses: fecha posterior, o sin fecha.
 * - Prevención: los ítems de categoría prevención, con cualquier fecha.
 * Solo ítems pendientes y no archivados. Lógica pura.
 */
import type { CarePlanItem } from '@/data/types';
import { sumarDias } from './fechas';

export type Plazo = 'hoy' | 'treinta' | 'meses' | 'prevencion';

export const PLAZOS: { clave: Plazo; titulo: string }[] = [
  { clave: 'hoy', titulo: 'Hoy' },
  { clave: 'treinta', titulo: 'Próximos 30 días' },
  { clave: 'meses', titulo: 'Próximos meses' },
  { clave: 'prevencion', titulo: 'Prevención' },
];

export function plazoDe(i: Pick<CarePlanItem, 'category' | 'targetDate'>, hoy: string): Plazo {
  if (i.category === 'prevencion') return 'prevencion';
  if (!i.targetDate) return 'meses';
  if (i.targetDate <= hoy) return 'hoy';
  if (i.targetDate <= sumarDias(hoy, 30)) return 'treinta';
  return 'meses';
}

export function planPorPlazo(items: CarePlanItem[], hoy: string): Record<Plazo, CarePlanItem[]> {
  const grupos: Record<Plazo, CarePlanItem[]> = { hoy: [], treinta: [], meses: [], prevencion: [] };
  items
    .filter((i) => !i.done && !i.cancelledAt && !i.archivedAt)
    .sort((a, b) => (a.targetDate ?? '9').localeCompare(b.targetDate ?? '9'))
    .forEach((i) => grupos[plazoDe(i, hoy)].push(i));
  return grupos;
}
