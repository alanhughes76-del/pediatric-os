import { datosDeEjemplo as db } from './mock';
import { alergiasCargadas, crecimientoDePacientes, listaConsultas, problemasActivos } from './clinica';

describe('módulos clínicos', () => {
  test('consultas: de la más nueva a la más vieja, con el estado de la nota', () => {
    const todas = listaConsultas(db);
    expect(todas.length).toBe(db.consultations.filter((c) => !c.archivedAt).length);
    const fechas = todas.map((x) => x.consulta.occurredAt);
    expect([...fechas].sort().reverse()).toEqual(fechas);
    expect(listaConsultas(db, 'borrador').every((x) => x.nota?.status === 'borrador')).toBe(true);
    expect(listaConsultas(db, 'sin-nota').every((x) => !x.nota)).toBe(true);
  });

  test('consultas: busca por paciente sin tildes', () => {
    const r = listaConsultas(db, 'todas', 'tomas');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.paciente.id === 'p-tomas')).toBe(true);
  });

  test('historia clínica: solo problemas activos; alergias confirmadas primero', () => {
    expect(problemasActivos(db).every((x) => x.problema.status === 'activo')).toBe(true);
    const a = alergiasCargadas(db);
    const primeraReferida = a.findIndex((x) => x.alergia.status === 'referida');
    expect(primeraReferida === -1 || a.slice(primeraReferida).every((x) => x.alergia.status === 'referida')).toBe(true);
  });

  test('crecimiento: una fila por paciente, con la última medición', () => {
    const filas = crecimientoDePacientes(db);
    expect(filas.length).toBe(db.patients.filter((p) => !p.archivedAt).length);
    const tomas = filas.find((f) => f.paciente.id === 'p-tomas')!;
    expect(tomas.ultima?.fecha).toBe('2026-06-09');
    expect(tomas.ultima?.peso?.resultado.ok).toBe(true);
    // Los que no tienen mediciones van al final.
    const primeraSin = filas.findIndex((f) => !f.ultima);
    expect(primeraSin).toBeGreaterThan(0);
    expect(filas.slice(primeraSin).every((f) => !f.ultima)).toBe(true);
  });

  test('crecimiento: una medición imposible queda primera, con aviso', () => {
    const conError = { ...db, measurements: [...db.measurements, { id: 'm-x', createdAt: 'x', createdBy: 'dr', patientId: 'p-mateo', measuredAt: '2026-10-01', weightKg: 96 }] };
    const filas = crecimientoDePacientes(conError);
    expect(filas[0].paciente.id).toBe('p-mateo');
    expect(filas[0].conAviso).toBe(true);
  });
});
