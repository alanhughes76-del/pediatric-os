import { estacionDe, fraseDeEstacion } from './estacion';

describe('estacionDe', () => {
  it('usa las estaciones del hemisferio sur', () => {
    expect(estacionDe('2026-01-15')).toBe('verano');
    expect(estacionDe('2026-03-20')).toBe('verano');
    expect(estacionDe('2026-03-21')).toBe('otoño');
    expect(estacionDe('2026-06-21')).toBe('invierno');
    expect(estacionDe('2026-09-20')).toBe('invierno');
    expect(estacionDe('2026-10-28T10:00:00-03:00')).toBe('primavera');
    expect(estacionDe('2026-12-21')).toBe('verano');
  });

  it('devuelve una frase por estación', () => {
    expect(fraseDeEstacion('2026-10-28')).toMatch(/^Primavera/);
  });
});
