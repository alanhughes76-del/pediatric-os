import { calcularAcceso } from '../../functions/src/acceso/calcular';

const HOY = '2026-10-17';
const adulto = { portalEnabled: true, email: 'lucia@ejemplo.com' };

describe('acceso al portal', () => {
  test('ve a los chicos con vínculo vigente', () => {
    expect(calcularAcceso(adulto, [{ patientId: 'p2' }, { patientId: 'p1', validTo: '2027-01-01' }], HOY)).toEqual({ enabled: true, patientIds: ['p1', 'p2'] });
  });
  test('un vínculo cerrado o archivado no cuenta', () => {
    expect(calcularAcceso(adulto, [{ patientId: 'p1', validTo: HOY }, { patientId: 'p2', archivedAt: 'x' }], HOY)).toEqual({ enabled: false, patientIds: [] });
  });
  test('sin portal habilitado o sin email, no entra', () => {
    expect(calcularAcceso({ ...adulto, portalEnabled: false }, [{ patientId: 'p1' }], HOY).enabled).toBe(false);
    expect(calcularAcceso({ ...adulto, email: '' }, [{ patientId: 'p1' }], HOY).enabled).toBe(false);
  });
});
