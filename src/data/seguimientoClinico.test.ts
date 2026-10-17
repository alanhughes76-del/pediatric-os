import { datosDeEjemplo } from './mock';
import { estudiosAbiertos, estudiosDe, medicacionActiva, medicacionActivaDeTodos, medicacionDe, resultadosSinRevisar, SIGUIENTE_ESTUDIO } from './seguimientoClinico';
import { vistaFamilia } from './vistaFamilia';
import type { Database, Medication } from './types';

const med = (id: string, startDate: string, endDate?: string): Medication => ({ id, createdAt: 'x', createdBy: 'dr', patientId: 'p-tomas', drug: id, dose: 'la que indique el médico', startDate, endDate });

describe('medicación', () => {
  test('activa sin fin o con fin desde hoy', () => {
    expect(medicacionActiva({ endDate: undefined }, '2026-10-17')).toBe(true);
    expect(medicacionActiva({ endDate: '2026-10-17' }, '2026-10-17')).toBe(true);
    expect(medicacionActiva({ endDate: '2026-10-16' }, '2026-10-17')).toBe(false);
  });
  test('separa activas y anteriores; el módulo junta las activas de todos', () => {
    const db: Database = { ...datosDeEjemplo, medications: [med('a', '2026-10-01'), med('b', '2026-01-01', '2026-02-01')] };
    const r = medicacionDe(db, 'p-tomas', '2026-10-17');
    expect(r.activas.map((m) => m.id)).toEqual(['a']);
    expect(r.anteriores.map((m) => m.id)).toEqual(['b']);
    expect(medicacionActivaDeTodos(db, '2026-10-17').map((x) => x.medicacion.id)).toEqual(['a']);
  });
});

describe('estudios', () => {
  test('recorrido de estados', () => {
    expect(SIGUIENTE_ESTUDIO).toEqual({ solicitado: 'realizado', realizado: 'resultado', resultado: 'revisado' });
  });
  test('el resultado sin revisar de Mateo va a Inicio y al módulo', () => {
    expect(resultadosSinRevisar(datosDeEjemplo, '2000-01-01').map((x) => x.paciente.id)).toEqual(['p-mateo']);
    expect(resultadosSinRevisar(datosDeEjemplo, '2999-01-01')[0].vencido).toBe(true);
    expect(estudiosAbiertos(datosDeEjemplo)).toHaveLength(1);
    expect(estudiosDe(datosDeEjemplo, 'p-mateo')[0].status).toBe('resultado');
  });
});

describe('vista de la familia', () => {
  test('ve las vacunas; no ve medicación, prescripciones ni estudios', () => {
    const db: Database = { ...datosDeEjemplo, medications: [med('a', '2026-10-01')] };
    const v = vistaFamilia(db, 'g-lucia');
    expect(v.vaccineDoses.length).toBeGreaterThan(0);
    expect(v.vaccineDoses.every((d) => ['p-tomas', 'p-emma'].includes(d.patientId))).toBe(true);
    expect(v.medications).toEqual([]);
    expect(v.prescriptions).toEqual([]);
    expect(v.studies).toEqual([]);
  });
  test('un ítem cancelado del plan no le llega', () => {
    const plan = datosDeEjemplo.carePlan.find((i) => i.patientId === 'p-tomas')!;
    const db: Database = { ...datosDeEjemplo, carePlan: datosDeEjemplo.carePlan.map((i) => (i.id === plan.id ? { ...i, cancelledAt: '2026-10-17T10:00:00-03:00' } : i)) };
    expect(vistaFamilia(db, 'g-lucia').carePlan.some((i) => i.id === plan.id)).toBe(false);
  });
});
