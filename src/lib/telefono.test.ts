import { normalizarTelefono, telefonoLegible } from './telefono';

describe('teléfono en E.164', () => {
  test.each([
    ['11 5555-0101', '+5491155550101'],
    ['011 15 5555-0101', '+5491155550101'],
    ['(011) 15-5555-0101', '+5491155550101'],
    ['+54 9 11 5555 0101', '+5491155550101'],
    ['54 11 5555-0101', '+5491155550101'],
    ['+5491155550101', '+5491155550101'],
    ['1155550101', '+5491155550101'],
    ['0351 15 555-0101', '+5493515550101'],
    ['2324 15 55-0101', '+5492324550101'],
  ])('"%s" → %s', (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado);
  });

  test.each(['', 'sin número', '5555-0101', '11 5555-01011234'])('"%s" no es un celular válido', (entrada) => {
    expect(normalizarTelefono(entrada)).toBeNull();
  });

  test('se muestra legible', () => {
    expect(telefonoLegible('+5491155550101')).toBe('+54 9 11 5555-0101');
    expect(telefonoLegible('+5493515550101')).toBe('+54 9 351 555-0101');
  });
});
