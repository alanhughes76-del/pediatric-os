import { datosDeEjemplo } from './mock';
import { contarMembresias, familiaDePago, filasMembresias, pagosAConfirmar, pagosDeFamilia } from './membresias';
import { membresiaDeFamilia, puedePedirVisitas } from './selectores';
import type { Database } from './types';

const db = datosDeEjemplo;

describe('membresías y pagos', () => {
  test('la familia de un pago sale de la membresía si el pago es viejo', () => {
    const viejo = { ...db.payments[0], familyId: undefined };
    expect(familiaDePago(db, viejo)).toBe('f-ferreyra');
  });

  test('pagos de una familia y pagos a confirmar', () => {
    expect(pagosDeFamilia(db, 'f-ferreyra').map((p) => p.id)).toEqual(['pg-1']);
    expect(pagosAConfirmar(db).map((p) => p.id)).toEqual(['pg-3']);
    const archivado: Database = { ...db, payments: db.payments.map((p) => (p.id === 'pg-3' ? { ...p, archivedAt: 'x' } : p)) };
    expect(pagosAConfirmar(archivado)).toEqual([]);
  });

  test('primero las vencidas; se cuentan por estado', () => {
    const filas = filasMembresias(db);
    expect(filas[0]).toMatchObject({ familyId: 'f-godoy', estado: 'vencida' });
    const c = contarMembresias(filas);
    expect(c.activa).toBe(1);
    expect(c.vencida).toBe(1);
  });

  test('suspendida bloquea pedir visitas; cancelada no (pide como cualquier familia)', () => {
    const con = (status: 'suspendida' | 'cancelada'): Database => ({ ...db, memberships: db.memberships.map((m) => (m.id === 'm-ferreyra' ? { ...m, status } : m)) });
    expect(membresiaDeFamilia(con('suspendida'), 'f-ferreyra').estado).toBe('suspendida');
    expect(puedePedirVisitas(con('suspendida'), 'g-lucia')).toBe(false);
    expect(membresiaDeFamilia(con('cancelada'), 'f-ferreyra').estado).toBe('cancelada');
    expect(puedePedirVisitas(con('cancelada'), 'g-lucia')).toBe(true);
  });
});
