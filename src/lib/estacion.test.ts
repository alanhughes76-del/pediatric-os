import { estacionDe, fraseDeEstacion, saludoDeHora } from './estacion';

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

describe('saludoDeHora', () => {
  it('cambia según la hora', () => {
    expect(saludoDeHora('06:00', 'Dr. Alan Hughes')).toBe('Buen día, Alan');
    expect(saludoDeHora('12:59', 'Dr. Alan Hughes')).toBe('Buen día, Alan');
    expect(saludoDeHora('13:00', 'Dr. Alan Hughes')).toBe('Buenas tardes, Alan');
    expect(saludoDeHora('20:00', 'Dr. Alan Hughes')).toBe('Buenas noches, Alan');
    expect(saludoDeHora('03:15', 'Dr. Alan Hughes')).toBe('Buenas noches, Alan');
  });

  it('usa el nombre de pila, con o sin título', () => {
    expect(saludoDeHora('10:00', 'Dra. Ana Paz')).toBe('Buen día, Ana');
    expect(saludoDeHora('10:00', 'Alan Hughes')).toBe('Buen día, Alan');
  });
});
