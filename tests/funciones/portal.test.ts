import { DESTINO, proyectarClinico, proyectarFamilia, proyectarPaciente, proyectarTurno } from '../../functions/src/portal/proyeccion';

const ctx = { calendarioVerificado: false };

describe('copias del portal: lo que ve la familia', () => {
  test('nota: solo aprobada y solo el resumen para la familia', () => {
    const nota = { status: 'aprobada', findings: 'Otitis media', plan: 'Antibiótico', allergiesMedication: 'x', familySummary: ' Tiene una otitis. ', consultationId: 'c1', version: 1, approvedAt: 'a', clinicalFlag: true };
    expect(proyectarClinico('notes', nota, { ...ctx, consulta: { occurredAt: 'f', visitType: 'control', rawText: 'texto interno' } }))
      .toEqual({ consultationId: 'c1', version: 1, approvedAt: 'a', familySummary: 'Tiene una otitis.', occurredAt: 'f', visitType: 'control' });
    expect(proyectarClinico('notes', { ...nota, status: 'borrador' }, ctx)).toBeNull();
    expect(proyectarClinico('notes', { ...nota, status: 'reemplazada' }, ctx)).toBeNull();
    expect(proyectarClinico('notes', { ...nota, familySummary: '  ' }, ctx)).toBeNull();
  });

  test('alergias referidas y problemas ocultos no llegan', () => {
    expect(proyectarClinico('allergies', { status: 'referida', allergen: 'Maní' }, ctx)).toBeNull();
    expect(proyectarClinico('allergies', { status: 'confirmada', allergen: 'Maní', severity: 'grave', notaInterna: 'x' }, ctx)).toEqual({ allergen: 'Maní', severity: 'grave' });
    expect(proyectarClinico('problems', { visibleToFamily: false, description: 'Soplo' }, ctx)).toBeNull();
    expect(proyectarClinico('problems', { visibleToFamily: true, description: 'Asma', status: 'activo' }, ctx)).toEqual({ description: 'Asma', status: 'activo' });
  });

  test('archivado no llega nunca', () => {
    expect(proyectarClinico('growth', { measuredAt: 'x', weightKg: 10, archivedAt: 'y' }, ctx)).toBeNull();
  });

  test('plan: solo pendientes', () => {
    expect(proyectarClinico('carePlan', { done: true, description: 'x' }, ctx)).toBeNull();
    expect(proyectarClinico('carePlan', { done: false, cancelledAt: 'x', description: 'x' }, ctx)).toBeNull();
    expect(proyectarClinico('carePlan', { done: false, category: 'control', description: 'Control', targetDate: 'd' }, ctx)).toEqual({ category: 'control', description: 'Control', targetDate: 'd' });
  });

  test('vacunas: aplicadas siempre; pendientes solo con el calendario verificado', () => {
    const pendiente = { status: 'pendiente', vaccine: 'BCG', dose: 'Única', dueDate: 'd', ageText: 'RN' };
    expect(proyectarClinico('vaccineDoses', pendiente, ctx)).toBeNull();
    expect(proyectarClinico('vaccineDoses', pendiente, { calendarioVerificado: true })).toEqual(pendiente);
    expect(proyectarClinico('vaccineDoses', { status: 'aplicada', vaccine: 'BCG', dose: 'Única', appliedDate: 'a', lot: 'L1', place: 'P' }, ctx))
      .toEqual({ status: 'aplicada', vaccine: 'BCG', dose: 'Única', appliedDate: 'a' });
  });

  test('documentos: no van al portal (la familia no baja archivos)', () => {
    expect(DESTINO.documents).toBeUndefined();
    expect(proyectarClinico('documents', { title: 'Eco', visibleToFamily: true, file: 'orgs/x' }, ctx)).toBeNull();
  });

  test('certificado sin motivo de anulación; fiebre sin quién la revisó', () => {
    expect(proyectarClinico('certificates', { type: 'libre', status: 'anulado', voidReason: 'error interno' }, ctx)).toEqual({ type: 'libre', status: 'anulado' });
    expect(proyectarClinico('fever', { kind: 'toma', temperatureC: 38.5, reviewedAt: 'r', reviewedBy: 'dr', consultationId: 'c' }, ctx))
      .toEqual({ kind: 'toma', temperatureC: 38.5, reviewed: true });
  });

  test('lo que nunca llega: medicación, estudios, prescripciones, antecedentes, consultas', () => {
    for (const sub of ['medications', 'studyOrders', 'prescriptions', 'background', 'consultations', 'followUps', 'milestones']) {
      expect(proyectarClinico(sub, { cualquier: 'cosa' }, ctx)).toBeNull();
    }
  });

  test('paciente, turno y familia', () => {
    expect(proyectarPaciente({ firstName: 'Ana', lastName: 'P', birthDate: 'b', sex: 'F', dni: '1', dniDigits: '1', scope: 'membresia', coverage: {}, bloodType: 'A+' }))
      .toEqual({ firstName: 'Ana', lastName: 'P', birthDate: 'b', sex: 'F' });
    expect(proyectarTurno({ status: 'cancelado' })).toBeNull();
    expect(proyectarTurno({ status: 'confirmado', start: 's', opsNotes: 'interno', porIdentificar: {}, address: { text: 'Calle 1', locality: 'Olivos', addressId: 'a' } }))
      .toEqual({ status: 'confirmado', start: 's', address: { text: 'Calle 1', locality: 'Olivos' } });
    expect(proyectarFamilia({ name: 'Familia P' }, { status: 'activa', renewalDate: 'r', patientIds: ['x'], notes: 'privado' }))
      .toEqual({ familyName: 'Familia P', membership: { status: 'activa', renewalDate: 'r' }, payments: [] });
  });
});

describe('pagos en el portal', () => {
  test('solo los confirmados, sin archivados, sin datos de quién los cargó', () => {
    const r = proyectarFamilia({ name: 'F' }, undefined, [
      { date: '2026-03-01', amount: 600, currency: 'USD', method: 'transferencia', concept: 'Membresía', status: 'confirmado', createdBy: 'u' },
      { date: '2026-04-01', amount: 100, currency: 'ARS', method: 'efectivo', status: 'a_confirmar' },
      { date: '2026-05-01', amount: 100, currency: 'ARS', method: 'efectivo', archivedAt: 'x' },
      { date: '2026-06-01', amount: 200, currency: 'ARS', method: 'efectivo' },
    ]);
    expect(r.payments).toEqual([
      { date: '2026-06-01', amount: 200, currency: 'ARS', method: 'efectivo' },
      { date: '2026-03-01', amount: 600, currency: 'USD', method: 'transferencia', concept: 'Membresía' },
    ]);
  });
});
