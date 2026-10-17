import { CALENDARIO, claveDosis, esquemaPara, estadoDosis, puedeRecordarVacunas, resumenVacunas, sumarMeses } from './vacunas';

describe('calendario de vacunas (borrador)', () => {
  test('se usa tal cual el archivo y las claves no se repiten', () => {
    expect(CALENDARIO.length).toBeGreaterThan(20);
    const claves = CALENDARIO.map(claveDosis);
    expect(new Set(claves).size).toBe(claves.length);
  });

  test('meses de calendario, sin pasarse de fin de mes', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2024-01-31', 1)).toBe('2024-02-29');
    expect(sumarMeses('2026-09-10', 0)).toBe('2026-09-10');
    expect(sumarMeses('2026-09-10', 16)).toBe('2028-01-10');
  });

  test('esquema de un recién nacido: una dosis por fila, con la fecha estimada', () => {
    const e = esquemaPara('2026-10-17');
    expect(e.length).toBe(CALENDARIO.filter((d) => d.tipo === 'obligatoria').length);
    const rn = e.filter((d) => d.ageMonths === 0);
    expect(rn.map((d) => d.vaccine).sort()).toEqual(['BCG', 'Hepatitis B']);
    expect(rn.every((d) => d.dueDate === '2026-10-17')).toBe(true);
    expect(e.find((d) => d.ageMonths === 2)!.dueDate).toBe('2026-12-17');
  });

  test('atrasada = pendiente con la fecha estimada ya pasada', () => {
    expect(estadoDosis({ status: 'pendiente', dueDate: '2026-10-01' }, '2026-10-17')).toBe('atrasada');
    expect(estadoDosis({ status: 'pendiente', dueDate: '2026-10-17' }, '2026-10-17')).toBe('pendiente');
    expect(estadoDosis({ status: 'aplicada', dueDate: '2026-01-01' }, '2026-10-17')).toBe('aplicada');
  });

  test('resumen: atrasadas, última aplicada y próxima', () => {
    const r = resumenVacunas([
      { vaccine: 'A', dose: '1ª', status: 'aplicada', dueDate: '2026-01-01', appliedDate: '2026-01-05' },
      { vaccine: 'B', dose: '1ª', status: 'pendiente', dueDate: '2026-09-01' },
      { vaccine: 'C', dose: '1ª', status: 'pendiente', dueDate: '2026-12-01' },
      { vaccine: 'D', dose: '1ª', status: 'pendiente', dueDate: '2026-11-01' },
    ], '2026-10-17');
    expect(r.alDia).toBe(false);
    expect(r.atrasadas.map((d) => d.vaccine)).toEqual(['B']);
    expect(r.ultima?.vaccine).toBe('A');
    expect(r.proxima?.vaccine).toBe('D');
  });

  test('sin calendario verificado no hay recordatorios', () => {
    expect(puedeRecordarVacunas({ calendarioVerificado: false })).toBe(false);
    expect(puedeRecordarVacunas({ calendarioVerificado: true })).toBe(true);
  });
});
