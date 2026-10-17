import { datosDeEjemplo } from './mock';
import { accionTurnoDemo, crearTurnoDemo, type Contexto } from './turnosDemo';
import { historialDeTurno, nombreDeTurno, porConfirmar, proximoTurno } from './selectores';
import { vistaFamilia } from './vistaFamilia';
import type { Database } from './types';
import type { DatosTurno } from './contrato';

let n = 0;
const ctx = (): Contexto => ({ ahora: '2026-10-17T10:00:00-03:00', ahoraMs: Date.now() + n, usuarioId: 'dr', nuevoId: (p) => `${p}-${++n}` });
// Lunes 2 de noviembre de 2026, dentro del horario de atención; base sin turnos ese día.
const base: Database = { ...datosDeEjemplo, appointments: [], appointmentHistory: [] };
const datos = (hhmm: string, extra: Partial<DatosTurno> = {}): DatosTurno & { confirmar: boolean } => ({
  start: `2026-11-02T${hhmm}:00-03:00`, durationMin: 45, type: 'control', modality: 'domicilio', familyId: null,
  patientIds: ['p-tomas'], address: { text: 'Libertador 2210', locality: 'Olivos' }, reason: '', opsNotes: '', confirmar: true, ...extra,
});

describe('turnos en la demostración (misma regla que el servidor)', () => {
  test('crear confirmado y rechazar otro confirmado superpuesto', () => {
    const a = crearTurnoDemo(base, ctx(), datos('10:00'));
    expect(a.resultado.estado).toBe('guardado');
    expect(a.db.appointments[0]).toMatchObject({ status: 'confirmado', familyId: 'f-ferreyra', zone: 'GBA Zona Norte', day: '2026-11-02' });
    const b = crearTurnoDemo(a.db, ctx(), { ...datos('10:30'), aceptarAvisos: true });
    expect(b.resultado).toEqual({ estado: 'error', mensaje: 'Se superpone con el turno de las 10:00.' });
    expect(b.db).toBe(a.db);
  });

  test('pendiente superpuesto: primero avisa, después guarda; cancelar el otro libera el horario', () => {
    const a = crearTurnoDemo(base, ctx(), datos('10:00'));
    const avisa = crearTurnoDemo(a.db, ctx(), datos('10:30', { confirmar: false } as Partial<DatosTurno>));
    expect(avisa.resultado.estado).toBe('avisos');
    const b = crearTurnoDemo(a.db, ctx(), { ...datos('10:30'), confirmar: false, aceptarAvisos: true });
    expect(b.resultado.estado).toBe('guardado');
    const segundo = b.db.appointments[1];
    expect(accionTurnoDemo(b.db, ctx(), { turno: segundo, accion: 'confirmar', aceptarAvisos: true }).resultado.estado).toBe('error');
    const sinMotivo = accionTurnoDemo(b.db, ctx(), { turno: b.db.appointments[0], accion: 'cancelar' });
    expect(sinMotivo.resultado).toEqual({ estado: 'error', mensaje: 'Para cancelar, escribí el motivo.' });
    const c = accionTurnoDemo(b.db, ctx(), { turno: b.db.appointments[0], accion: 'cancelar', motivo: 'Viajan' });
    const d = accionTurnoDemo(c.db, ctx(), { turno: segundo, accion: 'confirmar', aceptarAvisos: true });
    expect(d.resultado.estado).toBe('guardado');
    expect(d.db.appointments[1].status).toBe('confirmado');
  });

  test('reprogramar deja rastro en el historial', () => {
    const a = crearTurnoDemo(base, ctx(), datos('10:00'));
    const t = a.db.appointments[0];
    const b = accionTurnoDemo(a.db, ctx(), { turno: t, accion: 'reprogramar', start: '2026-11-03T16:00:00-03:00', aceptarAvisos: true });
    expect(b.db.appointments[0]).toMatchObject({ start: '2026-11-03T16:00:00-03:00', day: '2026-11-03', status: 'confirmado' });
    const h = historialDeTurno(b.db, t.id);
    expect(h.map((x) => x.action)).toEqual(['crear', 'reprogramar']);
    expect(h[1].before?.start).toBe('2026-11-02T10:00:00-03:00');
  });

  test('no se puede marcar realizado un turno sin confirmar', () => {
    const a = crearTurnoDemo(base, ctx(), { ...datos('10:00'), confirmar: false });
    expect(accionTurnoDemo(a.db, ctx(), { turno: a.db.appointments[0], accion: 'realizado' }).resultado)
      .toEqual({ estado: 'error', mensaje: 'No se puede hacer eso con un turno pendiente de confirmación.' });
  });

  test('identificar la familia de una solicitud de Cal.com', () => {
    const sol = datosDeEjemplo.appointments.find((t) => t.porIdentificar)!;
    expect(nombreDeTurno(datosDeEjemplo, sol)).toBe('Sofía Prueba (por identificar)');
    const r = accionTurnoDemo(datosDeEjemplo, ctx(), { turno: sol, accion: 'editar', cambios: { familyId: 'f-godoy', patientIds: ['p-benjamin'] }, aceptarAvisos: true });
    expect(r.resultado.estado).toBe('guardado');
    const t = r.db.appointments.find((x) => x.id === sol.id)!;
    expect(t.porIdentificar).toBeUndefined();
    expect(nombreDeTurno(r.db, t)).toBe('Benjamín Godoy');
  });
});

describe('selectores y vista de la familia', () => {
  test('hermanos en la misma visita', () => {
    const t = datosDeEjemplo.appointments.find((x) => x.id === 't-prox-emma')!;
    expect(nombreDeTurno(datosDeEjemplo, t)).toBe('Emma y Tomás Ruiz Ferreyra');
  });
  test('por confirmar: solicitudes y pendientes', () => {
    expect(porConfirmar(datosDeEjemplo, '2000-01-01').map((t) => t.status).sort()).toEqual(['pendiente', 'solicitado']);
  });
  test('la familia ve sus turnos sin notas operativas ni historial', () => {
    const v = vistaFamilia(datosDeEjemplo, 'g-martin');
    expect(v.appointments.map((t) => t.id).sort()).toEqual(['t-hoy-3', 't-prox-emma']);
    expect(v.appointments.every((t) => t.opsNotes === '' && !t.porIdentificar)).toBe(true);
    expect(v.appointmentHistory).toEqual([]);
    expect(v.blocks).toEqual([]);
    expect(proximoTurno(v, ['p-emma'], '2000-01-01')?.id).toBe('t-prox-emma');
  });
});
