import { datosDeEjemplo } from './mock';
import { csvReporte, filasReporte, htmlReporte, moverMes, nombreMes, reporteMensual } from './reportes';
import type { Database } from './types';

const db = datosDeEjemplo;
const HOY = '2026-10-17';

describe('reporte mensual', () => {
  test('visitas del mes por tipo y por ámbito (solo consultas realizadas de ese mes)', () => {
    const r = reporteMensual(db, '2026-09', HOY);
    expect(r.visitas.total).toBe(2);
    expect(r.visitas.porTipo.control).toBe(1);
    expect(r.visitas.porTipo.rn).toBe(1);
    const ambitos = Object.values(r.visitas.porAmbito).reduce((a, b) => a + b, 0);
    expect(ambitos).toBe(2);
  });

  test('pacientes nuevos: los creados en el mes', () => {
    const conNuevo: Database = { ...db, patients: [...db.patients, { ...db.patients[0], id: 'p-nuevo', createdAt: '2026-10-05T10:00:00-03:00' }] };
    expect(reporteMensual(conNuevo, '2026-10', HOY).pacientesNuevos.map((p) => p.id)).toContain('p-nuevo');
    expect(reporteMensual(conNuevo, '2026-09', HOY).pacientesNuevos.map((p) => p.id)).not.toContain('p-nuevo');
  });

  test('pagos: lo cobrado en el mes por moneda, sin los "a confirmar"', () => {
    const r = reporteMensual(db, '2026-03', HOY);
    expect(r.pagos.cobrado).toEqual({ USD: 600 });
    expect(r.pagos.aConfirmar.map((p) => p.id)).toEqual(['pg-3']);
  });

  test('un mes sin datos no inventa nada', () => {
    const r = reporteMensual(db, '2020-01', HOY);
    expect(r.visitas.total).toBe(0);
    expect(r.pacientesNuevos).toEqual([]);
    expect(r.pagos.cobrado).toEqual({});
  });

  test('CSV con punto y coma y acentos; PDF sin nombres de pacientes', () => {
    const r = reporteMensual(db, '2026-09', HOY);
    const csv = csvReporte(r);
    expect(csv.startsWith('﻿Sección;Concepto;Valor')).toBe(true);
    expect(csv).toContain('Visitas;Total del mes;2');
    const html = htmlReporte(r, '17/10/2026');
    expect(html).toContain('Reporte de septiembre de 2026');
    for (const p of db.patients) expect(html).not.toContain(p.lastName);
    expect(filasReporte(r).every((f) => f.length === 3)).toBe(true);
  });

  test('meses', () => {
    expect(nombreMes('2026-10')).toBe('octubre de 2026');
    expect(moverMes('2026-01', -1)).toBe('2025-12');
    expect(moverMes('2026-12', 1)).toBe('2027-01');
  });
});
