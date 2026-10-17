import { datosDeEjemplo } from './mock';
import { enlaceValido, enviadosA, sirveParaEdad, sugeridosPara, textoEdades } from './prevencion';
import { vistaFamilia } from './vistaFamilia';
import type { Database, EducationalMaterial } from './types';

const mat = (id: string, extra: Partial<EducationalMaterial> = {}): EducationalMaterial =>
  ({ id, createdAt: 'x', createdBy: 'dr', title: id, kind: 'enlace', url: 'https://ejemplo.com', topics: [], ...extra });

describe('prevención', () => {
  test('edades del material', () => {
    expect(sirveParaEdad({}, 30)).toBe(true);
    expect(sirveParaEdad({ ageFromMonths: 0, ageToMonths: 12 }, 9)).toBe(true);
    expect(sirveParaEdad({ ageFromMonths: 0, ageToMonths: 12 }, 13)).toBe(false);
    expect(textoEdades({ ageFromMonths: 0, ageToMonths: 12 })).toBe('0 meses a 12 meses');
    expect(textoEdades({ ageFromMonths: 24 })).toBe('Desde 2 años');
    expect(textoEdades({})).toBe('Cualquier edad');
  });

  test('sugiere solo entre lo cargado, según la edad, y no repite lo enviado', () => {
    // Emma nació el 20/01/2026: en octubre de 2026 tiene 8 meses.
    const db: Database = {
      ...datosDeEjemplo,
      educationalMaterials: [mat('lactancia', { ageToMonths: 12 }), mat('escolar', { ageFromMonths: 60 }), mat('general'), mat('viejo', { archivedAt: 'x' })],
      materialDeliveries: [{ id: 'e1', createdAt: 'x', createdBy: 'dr', patientId: 'p-emma', materialId: 'general', sentAt: '2026-10-01T10:00:00-03:00' }],
    };
    expect(sugeridosPara(db, 'p-emma', '2026-10-17').map((m) => m.id)).toEqual(['lactancia']);
    expect(enviadosA(db, 'p-emma').map((x) => x.material.id)).toEqual(['general']);
    // La familia ve solo lo que se le mandó.
    expect(vistaFamilia(db, 'g-lucia').educationalMaterials.map((m) => m.id)).toEqual(['general']);
    expect(vistaFamilia(db, 'g-carolina').educationalMaterials).toEqual([]);
  });

  test('solo enlaces https', () => {
    expect(enlaceValido('https://www.sap.org.ar/material.pdf')).toBe(true);
    expect(enlaceValido('http://inseguro.com')).toBe(false);
    expect(enlaceValido('javascript:alert(1)')).toBe(false);
  });
});
