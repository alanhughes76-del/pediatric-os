import { datosDeEjemplo } from './mock';
import { claseDe, comunicaciones, destinoDe, direccionDe } from './comunicaciones';
import type { Communication } from './types';

const db = datosDeEjemplo;

describe('registro de comunicaciones', () => {
  test('del más nuevo al más viejo', () => {
    const lista = comunicaciones(db);
    expect(lista.map((c) => c.id)).toEqual(['com-2', 'com-3', 'com-1']);
  });

  test('filtros por dirección, clasificación y familia', () => {
    expect(comunicaciones(db, { direccion: 'entrante' }).map((c) => c.id)).toEqual(['com-3']);
    expect(comunicaciones(db, { clase: 'clinico' }).map((c) => c.id)).toEqual(['com-1']);
    expect(comunicaciones(db, { familyId: 'f-ferreyra' }).map((c) => c.id)).toEqual(['com-2', 'com-3']);
  });

  test('los registros viejos (sin dirección ni clasificación) se entienden', () => {
    const viejo = { id: 'x', createdAt: '2026-01-01T10:00:00-03:00', createdBy: 'u', patientId: 'p-tomas', kind: 'resumen_familia', channel: 'email', status: 'enviado_a_make' } as Communication;
    expect(direccionDe(viejo)).toBe('saliente');
    expect(claseDe(viejo)).toBe('clinico');
    expect(destinoDe(db, viejo)).toBe('Familia Ruiz Ferreyra · Tomás');
  });
});
