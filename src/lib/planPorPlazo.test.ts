import type { CarePlanItem } from '@/data/types';
import { planPorPlazo, plazoDe } from './planPorPlazo';

const HOY = '2026-10-17';
const item = (id: string, x: Partial<CarePlanItem>): CarePlanItem => ({
  id, createdAt: '2026-01-01T00:00:00-03:00', createdBy: 'doc', patientId: 'p', category: 'control', description: id, done: false, ...x,
});

describe('plazoDe', () => {
  it('vencido o de hoy va a Hoy', () => {
    expect(plazoDe(item('a', { targetDate: '2026-10-01' }), HOY)).toBe('hoy');
    expect(plazoDe(item('a', { targetDate: HOY }), HOY)).toBe('hoy');
  });
  it('hasta 30 días va a Próximos 30 días (borde incluido)', () => {
    expect(plazoDe(item('a', { targetDate: '2026-10-18' }), HOY)).toBe('treinta');
    expect(plazoDe(item('a', { targetDate: '2026-11-16' }), HOY)).toBe('treinta');
  });
  it('después de 30 días o sin fecha va a Próximos meses', () => {
    expect(plazoDe(item('a', { targetDate: '2026-11-17' }), HOY)).toBe('meses');
    expect(plazoDe(item('a', {}), HOY)).toBe('meses');
  });
  it('prevención va siempre a Prevención', () => {
    expect(plazoDe(item('a', { category: 'prevencion', targetDate: HOY }), HOY)).toBe('prevencion');
  });
});

describe('planPorPlazo', () => {
  it('deja afuera hechos, cancelados y archivados, y ordena por fecha', () => {
    const g = planPorPlazo([
      item('hecho', { done: true, targetDate: HOY }),
      item('cancelado', { cancelledAt: '2026-10-01T00:00:00-03:00', targetDate: HOY }),
      item('archivado', { archivedAt: '2026-10-01T00:00:00-03:00', targetDate: HOY }),
      item('tarde', { targetDate: '2026-11-10' }),
      item('pronto', { targetDate: '2026-10-20' }),
      item('vacuna', { category: 'vacuna', targetDate: '2027-03-01' }),
    ], HOY);
    expect(g.hoy).toEqual([]);
    expect(g.treinta.map((i) => i.id)).toEqual(['pronto', 'tarde']);
    expect(g.meses.map((i) => i.id)).toEqual(['vacuna']);
  });
});
