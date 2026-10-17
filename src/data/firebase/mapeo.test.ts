import { datosDeEjemplo } from '../mock';
import { aFirestore, desdeFirestore, diferencias, ruta } from './mapeo';

test('rutas: administrativas, domicilios y clínicas', () => {
  expect(ruta('org', 'patients', { id: 'p1' })).toBe('organizations/org/patients/p1');
  expect(ruta('org', 'addresses', { id: 'a1', guardianId: 'g1' })).toBe('organizations/org/guardians/g1/addresses/a1');
  expect(ruta('org', 'measurements', { id: 'm1', patientId: 'p1' })).toBe('organizations/org/clinical/p1/growth/m1');
  expect(() => ruta('org', 'notes', { id: 'n1' })).toThrow();
});

test('el acceso al portal se llama distinto en Firestore', () => {
  expect(aFirestore('guardians', { id: 'g1', accessEnabled: true, phone: undefined })).toEqual({ portalEnabled: true });
  expect(desdeFirestore('guardians', 'g1', { portalEnabled: false, firstName: 'Ana' })).toEqual({ id: 'g1', accessEnabled: false, firstName: 'Ana' });
});

test('diferencias: altas y campos modificados, sin borrados', () => {
  const antes = datosDeEjemplo;
  const p = antes.problems[0];
  const despues = {
    ...antes,
    problems: [...antes.problems.slice(1), { ...p, status: 'resuelto' as const, resolvedDate: '2026-10-17' }],
    families: [...antes.families, { id: 'f-nueva', name: 'Familia Nueva', createdAt: 'x', createdBy: 'y' }],
    guardians: antes.guardians.slice(1),
  };
  const d = diferencias(antes, despues);
  expect(d).toHaveLength(2);
  expect(d.find((c) => c.tabla === 'families')).toMatchObject({ tipo: 'crear' });
  expect(d.find((c) => c.tabla === 'problems')).toMatchObject({ tipo: 'modificar', cambios: { status: 'resuelto', resolvedDate: '2026-10-17' } });
});

test('sin cambios, no hay nada que escribir', () => {
  expect(diferencias(datosDeEjemplo, datosDeEjemplo)).toEqual([]);
});
