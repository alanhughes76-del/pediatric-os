/**
 * Aceptación de la etapa D: entrando como cada adulto de ejemplo, ningún dato oculto
 * (problemas apagados, alergias referidas, hallazgos, borradores) aparece en los datos.
 */
import { datosDeEjemplo } from './mock';
import { vistaFamilia } from './vistaFamilia';
import type { Database } from './types';

const db = datosDeEjemplo;

/** Datos con algo oculto agregado a propósito para cada chico, para que el test no dependa del ejemplo. */
function conDatosOcultos(base: Database): Database {
  const extra = base.patients.flatMap((p) => [
    { tabla: 'problems', fila: { id: `oc-pr-${p.id}`, createdAt: '', createdBy: 'dr', patientId: p.id, description: 'OCULTO-problema', status: 'activo', visibleToFamily: false } },
    { tabla: 'allergies', fila: { id: `oc-al-${p.id}`, createdAt: '', createdBy: 'dr', patientId: p.id, allergen: 'OCULTO-alergia', severity: 'leve', status: 'referida' } },
  ]);
  const d = structuredClone(base) as Database;
  for (const e of extra) (d[e.tabla as 'problems' | 'allergies'] as unknown[]).push(e.fila);
  return d;
}

const completa = conDatosOcultos(db);

describe.each(db.guardians.map((g) => [`${g.firstName} ${g.lastName}`, g.id]))('portal de %s', (_nombre, guardianId) => {
  const v = vistaFamilia(completa, guardianId);
  const texto = JSON.stringify(v);
  const propios = new Set(
    completa.relationships.filter((r) => r.guardianId === guardianId && !r.validTo).map((r) => r.patientId),
  );

  test('solo ve a los chicos con los que tiene un vínculo vigente', () => {
    expect(v.patients.every((p) => propios.has(p.id))).toBe(true);
    expect(v.patients.length).toBe(propios.size);
    for (const tabla of ['problems', 'allergies', 'consultations', 'measurements', 'notes', 'carePlan', 'fever', 'documents', 'certificates'] as const) {
      expect((v[tabla] as { patientId: string }[]).every((f) => propios.has(f.patientId))).toBe(true);
    }
  });

  test('no ve problemas apagados ni alergias referidas', () => {
    expect(v.problems.every((p) => p.visibleToFamily)).toBe(true);
    expect(v.allergies.every((a) => a.status === 'confirmada')).toBe(true);
    expect(texto).not.toContain('OCULTO-');
  });

  test('de las notas solo ve el resumen de las aprobadas (nunca borradores, hallazgos ni conducta)', () => {
    expect(v.notes.every((n) => n.status === 'aprobada')).toBe(true);
    expect(v.notes.every((n) => n.findings === '' && n.plan === '' && n.allergiesMedication === '')).toBe(true);
    for (const n of completa.notes.filter((x) => x.status !== 'aprobada' || x.findings)) {
      if (n.status !== 'aprobada') expect(v.notes.some((x) => x.id === n.id)).toBe(false);
      // Si el médico repitió una frase en el resumen para la familia, esa frase sí la ve.
      const enResumen = (t: string) => completa.notes.some((x) => x.status === 'aprobada' && x.familySummary.includes(t));
      if (n.findings && !enResumen(n.findings)) expect(texto).not.toContain(n.findings);
      if (n.plan && !enResumen(n.plan)) expect(texto).not.toContain(n.plan);
    }
  });

  test('no ve el texto original de las consultas ni datos internos', () => {
    expect(v.consultations.every((c) => c.rawText === '')).toBe(true);
    expect(v.followUps).toEqual([]);
    expect(v.milestoneChecks).toEqual([]);
    expect(v.auditLog).toEqual([]);
    expect(v.certificates.every((c) => c.voidReason === undefined)).toBe(true);
  });

  test('de los otros adultos solo ve el nombre', () => {
    for (const g of v.guardians.filter((x) => x.id !== guardianId)) {
      expect(g.email).toBe('');
      expect(g.phone).toBeUndefined();
    }
  });
});

test('un vínculo quitado deja de dar acceso a ese chico', () => {
  const d = structuredClone(db) as Database;
  const r = d.relationships.find((x) => x.guardianId === 'g-martin' && x.patientId === 'p-tomas')!;
  r.validTo = '2000-01-01';
  expect(vistaFamilia(d, 'g-martin').patients.map((p) => p.id)).toEqual(['p-emma']);
});
