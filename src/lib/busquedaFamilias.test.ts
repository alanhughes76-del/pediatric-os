import { datosDeEjemplo } from '@/data/mock';
import { filtrarFamilias } from './busquedaFamilias';

const nombres = (q: string) => filtrarFamilias(datosDeEjemplo, q).map((f) => f.name);

test('sin búsqueda, todas en orden alfabético', () => {
  const todas = nombres('');
  expect(todas.length).toBe(datosDeEjemplo.families.length);
  expect([...todas].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))).toEqual(todas);
});
test('por apellido, sin tildes', () => {
  expect(nombres('benitez')).toContain('Familia Benítez');
});
test('por el nombre de un adulto', () => {
  expect(nombres('lucia')).toContain('Familia Ruiz Ferreyra');
});
test('por el nombre de un hijo', () => {
  expect(nombres('emma')).toContain('Familia Ruiz Ferreyra');
});
test('por teléfono, como se escriba', () => {
  expect(nombres('11 5555-0101')).toEqual(['Familia Ruiz Ferreyra']);
  expect(nombres('+5491155550101')).toEqual(['Familia Ruiz Ferreyra']);
});
