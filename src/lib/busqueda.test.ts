import type { Patient, Scope } from '@/data/types';
import { coincide, contarPorSolapa, filtrarPacientes, buscarDuplicados } from './busqueda';

const p = (id: string, firstName: string, lastName: string, birthDate: string, scope: Scope, archivado = false): Patient => ({
  id, firstName, lastName, birthDate, scope, sex: 'F', status: 'activo', createdAt: '', createdBy: '', archivedAt: archivado ? 'x' : undefined,
});

const lista = [
  p('1', 'Catalina', 'Núñez', '2026-02-27', 'membresia'),
  p('2', 'Tomás', 'Ruiz Ferreyra', '2023-05-12', 'membresia'),
  p('3', 'Paz', 'Acosta', '2023-09-15', 'cardales'),
  p('4', 'Juana', 'Acosta', '2023-09-15', 'cardales'),
  p('5', 'Lola', 'Aguirre', '2021-05-19', 'esporadico'),
  p('6', 'Archivada', 'Zeta', '2020-01-01', 'hepta', true),
];

test('busca sin distinguir mayúsculas ni tildes', () => {
  expect(coincide(lista[0], 'NUNEZ')).toBe(true);
  expect(coincide(lista[1], 'tomas')).toBe(true);
});
test('nombre y apellido en cualquier orden', () => {
  expect(coincide(lista[1], 'ruiz tomas')).toBe(true);
  expect(coincide(lista[1], 'tomas ruiz')).toBe(true);
});
test('iniciales', () => {
  expect(coincide(lista[1], 'trf')).toBe(true);
  expect(coincide(lista[2], 'pa')).toBe(true);
});
test('fecha de nacimiento dd/mm/aaaa, completa o parcial', () => {
  expect(filtrarPacientes(lista, 'todos', '15/09/2023').map((x) => x.id)).toEqual(['4', '3']);
  expect(coincide(lista[1], '12/5/2023')).toBe(true);
  expect(coincide(lista[4], '2021')).toBe(true);
});
test('orden alfabético por apellido y búsqueda dentro de la solapa activa', () => {
  expect(filtrarPacientes(lista, 'cardales', '').map((x) => x.lastName + x.firstName)).toEqual(['AcostaJuana', 'AcostaPaz']);
  expect(filtrarPacientes(lista, 'membresia', 'acosta')).toEqual([]);
});
test('conteos por solapa (sin archivados)', () => {
  expect(contarPorSolapa(lista)).toEqual({ todos: 5, membresia: 2, cardales: 2, hepta: 0, esporadico: 1, 'sin-asignar': 0 });
});
test('posible duplicado: mismo apellido (sin tildes ni mayúsculas) y fecha', () => {
  const posibles = (lastName: string, birthDate: string) => buscarDuplicados(lista, { lastName, birthDate }).posibles.length;
  expect(posibles('ACOSTA', '2023-09-15')).toBe(2);
  expect(posibles('Nunez', '2026-02-27')).toBe(1);
  expect(posibles('Acosta', '2023-09-16')).toBe(0);
});

test('busca por DNI, con o sin puntos', () => {
  const conDni = { ...lista[1], dni: '58.912.345' };
  expect(coincide(conDni, '58912345')).toBe(true);
  expect(coincide(conDni, '58.912')).toBe(false); // menos de 7 dígitos: se toma como fecha
  expect(coincide(conDni, '58.912.34')).toBe(true);
  expect(coincide(lista[0], '58912345')).toBe(false);
});
