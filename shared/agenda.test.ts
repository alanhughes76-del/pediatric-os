import {
  CONFIG_AGENDA_INICIAL as CONFIG, accionPermitida, accionesDe, avisosDeTurno, bloqueDe, choqueConConfirmados,
  diaDe, diasVecinos, estadoDespues, horaDe, inicioDe, sumarDiasA, zonaDe, type TurnoAgenda,
} from './agenda';

// 2026-10-19 es lunes.
const t = (id: string, hhmm: string, durationMin: number, status: TurnoAgenda['status'], dia = '2026-10-19'): TurnoAgenda =>
  ({ id, start: `${dia}T${hhmm}:00-03:00`, durationMin, status });

describe('horas en Argentina', () => {
  it('día y hora de un ISO con o sin zona', () => {
    expect(diaDe('2026-10-19T23:30:00-03:00')).toBe('2026-10-19');
    expect(diaDe('2026-10-20T01:00:00Z')).toBe('2026-10-19');
    expect(horaDe('2026-10-20T01:00:00Z')).toBe('22:00');
  });
  it('arma el inicio y rechaza fechas inválidas', () => {
    expect(inicioDe('2026-10-19', '10:30')).toBe('2026-10-19T10:30:00-03:00');
    expect(inicioDe('2026-02-30', '10:30')).toBeNull();
    expect(inicioDe('2026-10-19', '25:00')).toBeNull();
    expect(inicioDe('19/10/2026', '10:30')).toBeNull();
  });
  it('días vecinos (el buffer puede cruzar la medianoche)', () => {
    expect(diasVecinos('2026-11-01')).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
    expect(sumarDiasA('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('choque con turnos confirmados (lo que valida el servidor)', () => {
  const ocupado = [bloqueDe('2026-10-19T10:30:00-03:00', 45)]; // 10:30 a 11:15
  it('se pisan: bloquea con la hora del otro turno', () => {
    const c = choqueConConfirmados(bloqueDe('2026-10-19T11:00:00-03:00', 30), ocupado, 30);
    expect(c).toEqual({ tipo: 'superposicion', bloquea: true, mensaje: 'Se superpone con el turno de las 10:30.' });
  });
  it('no se pisan pero no queda el buffer: bloquea', () => {
    const c = choqueConConfirmados(bloqueDe('2026-10-19T11:30:00-03:00', 30), ocupado, 30);
    expect(c?.tipo).toBe('buffer');
    expect(c?.bloquea).toBe(true);
    // Antes del otro turno también cuenta el traslado.
    expect(choqueConConfirmados(bloqueDe('2026-10-19T09:30:00-03:00', 45), ocupado, 30)?.tipo).toBe('buffer');
  });
  it('con el buffer justo, entra', () => {
    expect(choqueConConfirmados(bloqueDe('2026-10-19T11:45:00-03:00', 30), ocupado, 30)).toBeNull();
    expect(choqueConConfirmados(bloqueDe('2026-10-19T09:15:00-03:00', 45), ocupado, 30)).toBeNull();
  });
  it('cruza la medianoche', () => {
    const noche = [bloqueDe('2026-10-19T23:40:00-03:00', 40)]; // termina 00:20 del 20
    expect(choqueConConfirmados(bloqueDe('2026-10-20T00:30:00-03:00', 30), noche, 30)?.tipo).toBe('buffer');
  });
});

describe('avisos al crear o mover un turno', () => {
  const base = { start: '2026-10-19T11:00:00-03:00', durationMin: 30, modality: 'domicilio' as const, locality: 'Olivos' };

  it('superposición con un confirmado: bloquea solo si el nuevo queda confirmado', () => {
    const otros = [t('a', '10:30', 45, 'confirmado')];
    expect(avisosDeTurno({ turno: base, quedaConfirmado: true, otros, config: CONFIG })[0]).toMatchObject({ tipo: 'superposicion', bloquea: true });
    expect(avisosDeTurno({ turno: base, quedaConfirmado: false, otros, config: CONFIG })[0]).toMatchObject({ tipo: 'superposicion', bloquea: false });
  });

  it('con una solicitud sin confirmar: avisa y no bloquea', () => {
    const [a] = avisosDeTurno({ turno: base, quedaConfirmado: true, otros: [t('a', '11:00', 30, 'solicitado')], config: CONFIG });
    expect(a).toMatchObject({ tipo: 'superposicion', bloquea: false });
    expect(a.mensaje).toContain('sin confirmar');
  });

  it('cancelados y ausentes liberan el horario; el propio turno no cuenta', () => {
    const otros = [t('a', '11:00', 30, 'cancelado'), t('b', '11:00', 30, 'ausente'), t('yo', '11:00', 30, 'confirmado')];
    expect(avisosDeTurno({ turno: { ...base, id: 'yo' }, quedaConfirmado: true, otros, config: CONFIG })).toEqual([]);
  });

  it('buffer insuficiente', () => {
    const [a] = avisosDeTurno({ turno: base, quedaConfirmado: true, otros: [t('a', '10:00', 45, 'confirmado')], config: CONFIG });
    expect(a).toMatchObject({ tipo: 'buffer', bloquea: true });
    expect(a.mensaje).toBe('Quedan menos de 30 min de traslado con el turno de las 10:00.');
  });

  it('fuera de horario: domingo sin horario y lunes a la noche', () => {
    const domingo = avisosDeTurno({ turno: { ...base, start: '2026-10-18T11:00:00-03:00' }, quedaConfirmado: true, otros: [], config: CONFIG });
    expect(domingo).toEqual([{ tipo: 'fuera_de_horario', bloquea: false, mensaje: 'Fuera del horario de atención: el domingo no tiene horario cargado.' }]);
    const noche = avisosDeTurno({ turno: { ...base, start: '2026-10-19T19:45:00-03:00' }, quedaConfirmado: true, otros: [], config: CONFIG });
    expect(noche[0].mensaje).toBe('Fuera del horario de atención del lunes (09:00 a 20:00).');
  });

  it('bloqueos: avisa', () => {
    const bloqueos = [{ desde: '2026-10-19T00:00:00-03:00', hasta: '2026-10-20T00:00:00-03:00', motivo: 'Congreso' }];
    expect(avisosDeTurno({ turno: base, quedaConfirmado: true, otros: [], config: CONFIG, bloqueos })[0])
      .toEqual({ tipo: 'bloqueo', bloquea: false, mensaje: 'Cae en un horario bloqueado (Congreso).' });
  });

  it('fuera de zona: avisa, no bloquea; telemedicina no se mira', () => {
    const [a] = avisosDeTurno({ turno: { ...base, locality: 'La Plata' }, quedaConfirmado: true, otros: [], config: CONFIG });
    expect(a).toMatchObject({ tipo: 'fuera_de_zona', bloquea: false });
    expect(avisosDeTurno({ turno: { ...base, locality: 'La Plata', modality: 'telemedicina' }, quedaConfirmado: true, otros: [], config: CONFIG })).toEqual([]);
  });
});

describe('zonas', () => {
  it('reconoce barrios de CABA y localidades de Zona Norte, con o sin tildes', () => {
    expect(zonaDe('Palermo, CABA', CONFIG.zonas)).toBe('CABA');
    expect(zonaDe('Núñez', CONFIG.zonas)).toBe('CABA');
    expect(zonaDe('Martínez', CONFIG.zonas)).toBe('GBA Zona Norte');
    expect(zonaDe('Exaltación de la Cruz', CONFIG.zonas)).toBe('GBA Zona Norte');
    expect(zonaDe('Quilmes', CONFIG.zonas)).toBeNull();
    expect(zonaDe('', CONFIG.zonas)).toBeNull();
  });
});

describe('estados', () => {
  it('solicitado → pendiente → confirmado → realizado', () => {
    expect(estadoDespues('solicitado', 'pendiente')).toBe('pendiente');
    expect(estadoDespues('pendiente', 'confirmar')).toBe('confirmado');
    expect(estadoDespues('confirmado', 'realizado')).toBe('realizado');
    expect(estadoDespues('confirmado', 'reprogramar')).toBe('confirmado');
  });
  it('no se confirma ni se cancela lo que ya terminó', () => {
    expect(accionPermitida('cancelado', 'confirmar')).toBe(false);
    expect(accionPermitida('realizado', 'cancelar')).toBe(false);
    expect(accionPermitida('solicitado', 'realizado')).toBe(false);
    expect(accionesDe('cancelado')).toEqual([]);
    expect(accionesDe('confirmado')).toEqual(['en_camino', 'realizado', 'reprogramar', 'editar', 'ausente', 'cancelar']);
  });
});
