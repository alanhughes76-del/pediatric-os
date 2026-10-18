import {
  avisosVacunas, controlesProximos, estudiosParaRevisar, membresiasPorRenovar, pagosVencidos, recordatorios24h, seguimientosVencidos,
} from '../../functions/src/outbox/programados';

const HOY = '2026-10-17';
const AHORA = Date.parse('2026-10-17T10:00:00-03:00');

describe('avisos programados', () => {
  test('recordatorio 24 h: solo confirmados que empiezan entre 23 y 25 horas', () => {
    const r = recordatorios24h([
      { id: 't1', status: 'confirmado', start: '2026-10-18T10:00:00-03:00', patientIds: ['p'] },
      { id: 't2', status: 'confirmado', start: '2026-10-18T14:00:00-03:00' },
      { id: 't3', status: 'solicitado', start: '2026-10-18T10:00:00-03:00' },
      { id: 't4', status: 'confirmado', start: '2026-10-18T10:00:00-03:00', archivedAt: 'x' },
    ], AHORA);
    expect(r.map((a) => a.clave)).toEqual(['t1_2026-10-18T10:00:00-03:00']);
    expect(r[0].data).toMatchObject({ appointmentId: 't1', patientIds: ['p'] });
  });

  test('seguimientos vencidos', () => {
    const r = seguimientosVencidos([
      { id: 'f1', status: 'pendiente', dueAt: '2026-10-16T10:00:00-03:00', patientId: 'p' },
      { id: 'f2', status: 'pendiente', dueAt: '2026-10-20T10:00:00-03:00' },
      { id: 'f3', status: 'resuelto', dueAt: '2026-10-01T10:00:00-03:00' },
    ], '2026-10-17T10:00:00-03:00');
    expect(r.map((a) => a.clave)).toEqual(['f1']);
  });

  test('vacunas: nada si el calendario no está verificado; sin el nombre de la vacuna', () => {
    const dosis = [
      { id: 'd1', status: 'pendiente', dueDate: '2026-10-25', patientId: 'p', vaccine: 'BCG' },
      { id: 'd2', status: 'pendiente', dueDate: '2026-09-01', patientId: 'p' },
      { id: 'd3', status: 'pendiente', dueDate: '2026-12-01', patientId: 'p' },
      { id: 'd4', status: 'aplicada', dueDate: '2026-10-20', patientId: 'p' },
    ];
    expect(avisosVacunas(dosis, HOY, false)).toEqual({ proximas: [], atrasadas: [] });
    const r = avisosVacunas(dosis, HOY, true);
    expect(r.proximas.map((a) => a.clave)).toEqual(['d1']);
    expect(r.atrasadas.map((a) => a.clave)).toEqual(['d2']);
    expect(JSON.stringify(r)).not.toContain('BCG');
  });

  test('estudios para revisar: la fecha llegó y no está revisado; sin el nombre del estudio', () => {
    const r = estudiosParaRevisar([
      { id: 'e1', status: 'resultado', reviewDate: '2026-10-17', patientId: 'p', study: 'Ecografía' },
      { id: 'e2', status: 'revisado', reviewDate: '2026-10-10' },
      { id: 'e3', status: 'solicitado', reviewDate: '2026-11-10' },
    ], HOY);
    expect(r.map((a) => a.clave)).toEqual(['e1_2026-10-17']);
    expect(JSON.stringify(r)).not.toContain('Ecografía');
  });

  test('membresía por renovar: a los 30 días y otra vez 20 días después', () => {
    const m = (renewalDate: string) => [{ id: 'm1', status: 'activa', familyId: 'f', renewalDate }];
    expect(membresiasPorRenovar(m('2026-11-16'), HOY).map((a) => a.clave)).toEqual(['m1_1']);
    expect(membresiasPorRenovar(m('2026-10-27'), HOY).map((a) => a.clave)).toEqual(['m1_2']);
    expect(membresiasPorRenovar(m('2026-12-01'), HOY)).toEqual([]);
    expect(membresiasPorRenovar(m('2026-10-01'), HOY)).toEqual([]);
  });

  test('pago vencido: 15 días después de la renovación, sin pago nuevo ni membresía más nueva', () => {
    const vieja = { id: 'm1', status: 'activa', familyId: 'f', renewalDate: '2026-10-01' };
    expect(pagosVencidos([vieja], [], HOY).map((a) => a.clave)).toEqual(['m1_2026-10-01']);
    expect(pagosVencidos([vieja], [{ id: 'p', familyId: 'f', date: '2026-10-05', status: 'confirmado' }], HOY)).toEqual([]);
    expect(pagosVencidos([vieja], [{ id: 'p', familyId: 'f', date: '2026-10-05', status: 'a_confirmar' }], HOY)).toHaveLength(1);
    expect(pagosVencidos([vieja, { id: 'm2', status: 'activa', familyId: 'f', renewalDate: '2027-10-01' }], [], HOY)).toEqual([]);
    expect(pagosVencidos([{ ...vieja, renewalDate: '2026-10-10' }], [], HOY)).toEqual([]);
    expect(pagosVencidos([{ ...vieja, status: 'cancelada' }], [], HOY)).toEqual([]);
  });

  test('controles próximos: categoría control en 7 días, sin la descripción', () => {
    const r = controlesProximos([
      { id: 'c1', category: 'control', targetDate: '2026-10-20', done: false, patientId: 'p', description: 'Control de 9 meses' },
      { id: 'c2', category: 'prevencion', targetDate: '2026-10-20', done: false },
      { id: 'c3', category: 'control', targetDate: '2026-11-20', done: false },
      { id: 'c4', category: 'control', targetDate: '2026-10-20', done: true },
    ], HOY);
    expect(r.map((a) => a.clave)).toEqual(['c1_2026-10-20']);
    expect(JSON.stringify(r)).not.toContain('9 meses');
  });
});
