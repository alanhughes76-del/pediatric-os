import { aCampo, celdasDelMes, deCampo, dentro, diasDelMes, fechaParaLeer, moverMes } from './calendario';

describe('calendario', () => {
  test('octubre de 2026 arranca un jueves: tres huecos (lunes a miércoles)', () => {
    const c = celdasDelMes(2026, 9);
    expect(c.slice(0, 4)).toEqual([null, null, null, 1]);
    expect(c.filter((x) => x !== null)).toHaveLength(31);
    expect(c.length % 7).toBe(0);
  });

  test('un mes que arranca un lunes no tiene huecos al principio', () => {
    expect(celdasDelMes(2026, 5)[0]).toBe(1); // junio de 2026 arranca un lunes
  });

  test('febrero bisiesto y no bisiesto', () => {
    expect(diasDelMes(2024, 1)).toBe(29);
    expect(diasDelMes(2026, 1)).toBe(28);
  });

  test('cambiar de mes cruza el año', () => {
    expect(moverMes(2026, 0, -1)).toEqual({ anio: 2025, mes: 11 });
    expect(moverMes(2026, 11, 1)).toEqual({ anio: 2027, mes: 0 });
  });

  test('campo ↔ fecha', () => {
    expect(aCampo('2026-10-05')).toBe('05/10/2026');
    expect(deCampo('5/10/2026')).toBe('2026-10-05');
    expect(deCampo('31/02/2026')).toBeNull();
    expect(deCampo('')).toBeNull();
  });

  test('límites y lectura', () => {
    expect(dentro('2026-10-17', '2026-10-17')).toBe(true);
    expect(dentro('2026-10-16', '2026-10-17')).toBe(false);
    expect(dentro('2026-10-18', undefined, '2026-10-17')).toBe(false);
    expect(fechaParaLeer('2026-10-20')).toBe('martes 20 de octubre de 2026');
  });
});
