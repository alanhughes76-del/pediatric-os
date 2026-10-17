import { createHmac } from 'node:crypto';
import { firmaCalValida, leerReservaCal } from '../../functions/src/turnos/calcom';
import { turnoNuevo, validarCampos } from '../../functions/src/turnos/datos';
import { CONFIG_AGENDA_INICIAL as CONFIG } from '../../shared/agenda';

const reserva = (extra: Record<string, unknown> = {}, trigger = 'BOOKING_CREATED') => ({
  triggerEvent: trigger,
  payload: {
    uid: 'abc123',
    type: 'control-de-salud',
    title: 'Control de salud',
    startTime: '2026-10-20T13:00:00.000Z',
    endTime: '2026-10-20T13:45:00.000Z',
    attendees: [{ name: 'Laura Prueba', email: 'laura@ejemplo.com', timeZone: 'America/Argentina/Buenos_Aires' }],
    responses: { name: { value: 'Laura Prueba' }, dni: { value: '55.123.456' }, telefono: { value: '011 15 5555-1234' }, direccion: { value: 'Calle Falsa 123' }, localidad: { value: 'Olivos' } },
    ...extra,
  },
});

describe('Cal.com', () => {
  test('firma: HMAC-SHA256 del cuerpo en hexadecimal', () => {
    const cuerpo = JSON.stringify(reserva());
    const firma = createHmac('sha256', 'secreto').update(cuerpo).digest('hex');
    expect(firmaCalValida(cuerpo, 'secreto', firma)).toBe(true);
    expect(firmaCalValida(cuerpo, 'otro', firma)).toBe(false);
    expect(firmaCalValida(cuerpo, 'secreto', undefined)).toBe(false);
    expect(firmaCalValida(cuerpo, '', firma)).toBe(false);
  });

  test('lee la reserva en hora de Argentina, con DNI y teléfono normalizados', () => {
    expect(leerReservaCal(reserva())).toEqual({
      evento: 'creada', uid: 'abc123', anteriorUid: undefined, start: '2026-10-20T10:00:00-03:00', durationMin: 45, type: 'control',
      name: 'Laura Prueba', email: 'laura@ejemplo.com', phone: '+5491155551234', dni: '55123456', address: 'Calle Falsa 123', locality: 'Olivos', reason: '',
    });
  });

  test('urgencia de noche, cancelación y reprogramación', () => {
    const noche = leerReservaCal(reserva({ type: 'urgencia', startTime: '2026-10-20T23:30:00.000Z', endTime: '2026-10-21T00:10:00.000Z' }));
    expect(noche).toMatchObject({ type: 'urgencia-noche', start: '2026-10-20T20:30:00-03:00', durationMin: 40 });
    expect(leerReservaCal(reserva({}, 'BOOKING_CANCELLED'))?.evento).toBe('cancelada');
    expect(leerReservaCal(reserva({ rescheduleUid: 'viejo1' }, 'BOOKING_RESCHEDULED'))).toMatchObject({ evento: 'reprogramada', anteriorUid: 'viejo1' });
  });

  test('sin uid o sin horario, no se acepta', () => {
    expect(leerReservaCal({ triggerEvent: 'BOOKING_CREATED', payload: { startTime: '2026-10-20T13:00:00Z' } })).toBeNull();
    expect(leerReservaCal(reserva({ startTime: 'mañana' }))).toBeNull();
    expect(leerReservaCal(reserva({ uid: '../otra-ruta' }))).toBeNull();
    expect(leerReservaCal(null)).toBeNull();
  });
});

describe('datos del turno', () => {
  const base = { org: 'o', uid: 'u', ahora: '2026-10-17T10:00:00-03:00', config: CONFIG };

  test('turno nuevo: duración por tipo, día y zona derivados, pendiente salvo que se confirme', () => {
    const t = turnoNuevo({ ...base, datos: { start: '2026-10-19T10:00:00-03:00', type: 'control', patientIds: ['p1'], address: { text: 'Calle 1', locality: 'Martínez' } } });
    expect(t).toMatchObject({ durationMin: 45, day: '2026-10-19', zone: 'GBA Zona Norte', status: 'pendiente', origin: 'medico', modality: 'domicilio' });
    expect(turnoNuevo({ ...base, datos: { start: '2026-10-19T10:00:00-03:00', type: 'control', patientIds: ['p1'], confirmar: true } }).status).toBe('confirmado');
  });

  test('prenatal va con la familia y sin paciente; el resto necesita paciente', () => {
    expect(turnoNuevo({ ...base, datos: { start: '2026-10-19T10:00:00-03:00', type: 'prenatal', familyId: 'f1' } }).patientIds).toEqual([]);
    expect(() => turnoNuevo({ ...base, datos: { start: '2026-10-19T10:00:00-03:00', type: 'control' } })).toThrow('Elegí al menos un paciente.');
    expect(() => turnoNuevo({ ...base, datos: { start: '2026-10-19T10:00:00-03:00', type: 'prenatal' } })).toThrow('Un turno prenatal va con la familia');
  });

  test('rechaza datos inválidos', () => {
    expect(() => turnoNuevo({ ...base, datos: { start: 'mañana', type: 'control', patientIds: ['p1'] } })).toThrow('Revisá la fecha');
    expect(() => turnoNuevo({ ...base, datos: { start: '2026-10-19T10:00:00-03:00', type: 'control', patientIds: ['p1'], durationMin: 5 } })).toThrow('duración');
    expect(() => validarCampos({ type: 'cirugia' })).toThrow('tipo de turno');
    expect(() => validarCampos({ patientIds: ['../x'] })).toThrow('pacientes');
    expect(() => validarCampos({ reason: 'x'.repeat(201) })).toThrow('demasiado largo');
  });
});
