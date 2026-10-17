import { buscarDuplicados, normalizar, soloDigitos } from './duplicados';

const pacientes = [
  { id: 'p1', lastName: 'Núñez', birthDate: '2023-05-12', dni: '58.912.345' },
  { id: 'p2', lastName: 'Gómez', birthDate: '2020-01-01' },
  { id: 'p3', lastName: 'Archivado', birthDate: '2020-01-01', dni: '11111111', archivedAt: '2026-01-01' },
];

describe('control de duplicados (regla 8)', () => {
  test('el mismo DNI, escrito con o sin puntos, bloquea', () => {
    expect(buscarDuplicados(pacientes, { lastName: 'Otro', birthDate: '2024-01-01', dni: '58912345' }).mismoDni.map((p) => p.id)).toEqual(['p1']);
  });
  test('mismo apellido (sin tildes ni mayúsculas) y fecha: posible duplicado', () => {
    const r = buscarDuplicados(pacientes, { lastName: 'NUNEZ', birthDate: '2023-05-12' });
    expect(r.mismoDni).toEqual([]);
    expect(r.posibles.map((p) => p.id)).toEqual(['p1']);
  });
  test('si coincide el DNI no se repite como "posible"', () => {
    const r = buscarDuplicados(pacientes, { lastName: 'Núñez', birthDate: '2023-05-12', dni: '58912345' });
    expect(r.mismoDni).toHaveLength(1);
    expect(r.posibles).toHaveLength(0);
  });
  test('los archivados no cuentan', () => {
    expect(buscarDuplicados(pacientes, { lastName: 'X', birthDate: '2000-01-01', dni: '11.111.111' }).mismoDni).toEqual([]);
  });
  test('sin coincidencias, se puede guardar', () => {
    expect(buscarDuplicados(pacientes, { lastName: 'Nuevo', birthDate: '2025-01-01', dni: '' })).toEqual({ mismoDni: [], posibles: [] });
  });
  test('auxiliares', () => {
    expect(normalizar(' Ibáñez ')).toBe('ibanez');
    expect(soloDigitos('58.912.345')).toBe('58912345');
  });
});
