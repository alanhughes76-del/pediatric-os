import { armarEntrada } from '../../functions/src/auditoria/armar';

const base = { path: 'clinical/p1/problems/pr1', entity: 'problems', entityId: 'pr1', patientId: 'p1', ahora: '2026-10-17T13:00:00.000Z' };

describe('registro de auditoría', () => {
  test('un alta guarda todos los campos con valor anterior vacío', () => {
    const e = armarEntrada({ ...base, antes: undefined, despues: { description: 'Asma', updatedBy: 'medico-1', updatedAt: 'x' } });
    expect(e).toMatchObject({ action: 'crear', actorId: 'medico-1', actorType: 'persona', patientId: 'p1' });
    expect(e!.changes).toEqual({ description: { antes: null, despues: 'Asma' } });
  });

  test('un cambio guarda solo lo que cambió, con antes y después', () => {
    const e = armarEntrada({
      ...base,
      antes: { description: 'Asma', status: 'activo', updatedBy: 'medico-1', updatedAt: 'a' },
      despues: { description: 'Asma', status: 'resuelto', updatedBy: 'medico-1', updatedAt: 'b' },
    });
    expect(e!.action).toBe('modificar');
    expect(e!.changes).toEqual({ status: { antes: 'activo', despues: 'resuelto' } });
  });

  test('si solo cambió la fecha de modificación no se registra nada', () => {
    expect(armarEntrada({ ...base, antes: { a: 1, updatedAt: 'a' }, despues: { a: 1, updatedAt: 'b' } })).toBeNull();
  });

  test('archivar se registra como archivado', () => {
    const e = armarEntrada({ ...base, antes: { a: 1, updatedBy: 'medico-1' }, despues: { a: 1, archivedAt: 'hoy', updatedBy: 'medico-1' } });
    expect(e!.action).toBe('archivar');
  });

  test('distingue persona, sistema e IA', () => {
    expect(armarEntrada({ ...base, antes: undefined, despues: { a: 1, updatedBy: 'sistema' } })!.actorType).toBe('sistema');
    expect(armarEntrada({ ...base, antes: undefined, despues: { a: 1, updatedBy: 'medico-1', origin: 'ia' } })!.actorType).toBe('ia');
    expect(armarEntrada({ ...base, antes: undefined, despues: { a: 1, updatedBy: 'g-lucia', origin: 'familia' } })!.actorType).toBe('persona');
  });

  test('un borrado (que las reglas no permiten) igual queda registrado', () => {
    expect(armarEntrada({ ...base, antes: { a: 1, updatedBy: 'medico-1' }, despues: undefined })!.action).toBe('borrar');
  });
});
