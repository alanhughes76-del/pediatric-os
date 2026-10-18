import { armarVistaFamilia } from './portalFamilia';
import { datosDeEjemplo } from '../mock';
import { pacientesDeAdulto, proximoTurno, membresiaDeFamilia, informesFamilia } from '../selectores';
import type { Database, Guardian } from '../types';
import { pagosDeFamilia } from '../membresias';

const guardian = { ...datosDeEjemplo.guardians.find((g) => g.id === 'g-lucia')! } as Guardian;
const vacia = { ...datosDeEjemplo, patients: [], families: [], notes: [] } as unknown as Database;

const vista = armarVistaFamilia({
  guardian,
  addresses: datosDeEjemplo.addresses,
  doctor: datosDeEjemplo.doctor,
  vacia,
  copias: {
    'p-tomas': {
      datos: [
        { id: 'paciente', datos: { firstName: 'Tomás', lastName: 'Ruiz', birthDate: '2023-05-12', sex: 'M', familyId: 'f-1' } },
        { id: 'familia', datos: { familyName: 'Familia Ruiz', membership: { plan: 'anual', status: 'activa', startDate: '2026-03-01', renewalDate: '2027-02-28' }, payments: [{ date: '2026-03-01', amount: 600, currency: 'USD', method: 'transferencia', concept: 'Membresía' }] } },
      ],
      summaries: [{ id: 'n1', datos: { consultationId: 'c1', version: 1, familySummary: 'Está muy bien.', approvedAt: '2026-10-10T11:00:00-03:00', occurredAt: '2026-10-10T10:00:00-03:00', visitType: 'control' } }],
      turnos: [{ id: 't1', datos: { start: '2099-01-01T10:00:00-03:00', day: '2099-01-01', durationMin: 45, type: 'control', status: 'confirmado', patientIds: ['p-tomas', 'p-emma'] } }],
      fever: [{ id: 'fv1', datos: { kind: 'toma', at: '2026-10-17T10:00:00-03:00', temperatureC: 38.2, reviewed: true } }],
    },
    'p-emma': {
      datos: [{ id: 'paciente', datos: { firstName: 'Emma', lastName: 'Ruiz', birthDate: '2026-01-20', sex: 'F', familyId: 'f-1' } }],
      turnos: [{ id: 't1', datos: { start: '2099-01-01T10:00:00-03:00', day: '2099-01-01', durationMin: 45, type: 'control', status: 'confirmado', patientIds: ['p-tomas', 'p-emma'] } }],
    },
  },
});

describe('portal en Firebase: las copias con la forma de las pantallas', () => {
  test('chicos, familia y membresía', () => {
    expect(pacientesDeAdulto(vista, 'g-lucia').map((p) => p.firstName).sort()).toEqual(['Emma', 'Tomás']);
    expect(vista.families).toEqual([expect.objectContaining({ id: 'f-1', name: 'Familia Ruiz' })]);
    expect(membresiaDeFamilia(vista, 'f-1').estado).toBe('activa');
    expect(pagosDeFamilia(vista, 'f-1')).toEqual([expect.objectContaining({ amount: 600, currency: 'USD', concept: 'Membresía' })]);
  });

  test('resúmenes como notas aprobadas, sin nada clínico', () => {
    const [informe] = informesFamilia(vista, 'p-tomas');
    expect(informe).toMatchObject({ resumen: 'Está muy bien.', version: 1 });
    expect(vista.notes[0]).toMatchObject({ status: 'aprobada', findings: '', plan: '', allergiesMedication: '' });
    expect(vista.consultations[0]).toMatchObject({ id: 'c1', occurredAt: '2026-10-10T10:00:00-03:00', rawText: '' });
  });

  test('un turno de hermanos aparece una sola vez; la fiebre revisada; sin documentos ni materiales', () => {
    expect(vista.appointments).toHaveLength(1);
    expect(proximoTurno(vista, ['p-emma'], '2026-10-17')?.id).toBe('t1');
    expect(vista.fever[0].reviewedAt).toBeTruthy();
    expect(vista.documents).toEqual([]);
    expect(vista.materialDeliveries).toEqual([]);
  });

  test('solo su propio adulto y sus direcciones', () => {
    expect(vista.guardians.map((g) => g.id)).toEqual(['g-lucia']);
    expect(vista.addresses.every((a) => a.guardianId === 'g-lucia')).toBe(true);
  });
});
