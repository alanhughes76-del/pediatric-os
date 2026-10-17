import { horasDeSeguimiento, mensajeSeguimiento, vencimientoSeguimiento } from './seguimiento';

test('urgencia: 24 h; el resto: 48 h', () => {
  expect(horasDeSeguimiento('urgencia-noche')).toBe(24);
  expect(horasDeSeguimiento('control')).toBe(48);
  expect(vencimientoSeguimiento('2026-10-17T10:00:00-03:00', 'urgencia-dia')).toBe('2026-10-18T10:00:00-03:00');
});

test('mensaje con saludo, resumen e indicaciones', () => {
  expect(mensajeSeguimiento({ nombreAdulto: 'Lucía', resumenFamilia: 'Está mejor.', conducta: 'Control en 48 h.' }))
    .toBe('Hola, Lucía.\n\nEstá mejor.\n\nIndicaciones: Control en 48 h.');
  expect(mensajeSeguimiento({ resumenFamilia: 'Todo bien.', conducta: '' })).toBe('Hola.\n\nTodo bien.');
});

test('fecha y hora de Argentina, como la app', () => {
  const { isoArgentina } = jest.requireActual('./fechaHora');
  expect(isoArgentina(Date.parse('2026-10-17T13:05:30Z'))).toBe('2026-10-17T10:05:00-03:00');
});
