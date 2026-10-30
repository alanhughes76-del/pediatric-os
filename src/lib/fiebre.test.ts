import { leerTemperatura, pasoTemperatura } from './fiebre';

describe('pasoTemperatura', () => {
  it('arranca en 37,0 si está vacío, con cualquiera de los dos botones', () => {
    expect(pasoTemperatura('', 0.1)).toBe('37,0');
    expect(pasoTemperatura('', -0.1)).toBe('37,0');
  });

  it('sube y baja de a una décima, sin errores de redondeo', () => {
    expect(pasoTemperatura('38,5', 0.1)).toBe('38,6');
    expect(pasoTemperatura('38.5', -0.1)).toBe('38,4');
    expect(pasoTemperatura('37,9', 0.1)).toBe('38,0');
  });

  it('no pasa de los límites que acepta leerTemperatura', () => {
    expect(pasoTemperatura('43', 0.1)).toBe('43,0');
    expect(pasoTemperatura('34', -0.1)).toBe('34,0');
    expect(leerTemperatura(pasoTemperatura('43', 0.1))).toBe(43);
  });

  it('un texto que no es temperatura vuelve a 37,0', () => {
    expect(pasoTemperatura('5', 0.1)).toBe('37,0');
  });
});
