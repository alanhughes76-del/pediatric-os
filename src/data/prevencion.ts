/**
 * Prevención y educación (prompt maestro 7.12): la biblioteca la carga el Dr.; la app solo sugiere
 * entre esos materiales según la edad del paciente. Nada se genera. Lógica pura, con tests.
 */
import type { Database, EducationalMaterial, ID } from './types';
import { edadEnMeses } from '@/lib/edad';

/** El material sirve para esa edad (sin límites = cualquier edad). */
export const sirveParaEdad = (m: Pick<EducationalMaterial, 'ageFromMonths' | 'ageToMonths'>, meses: number) =>
  (m.ageFromMonths === undefined || meses >= m.ageFromMonths) && (m.ageToMonths === undefined || meses <= m.ageToMonths);

export function biblioteca(db: Database) {
  return db.educationalMaterials.filter((m) => !m.archivedAt).sort((a, b) => a.title.localeCompare(b.title));
}

/** Sugeridos para el paciente: los de su edad que todavía no se le mandaron. */
export function sugeridosPara(db: Database, patientId: ID, hoy: string) {
  const p = db.patients.find((x) => x.id === patientId);
  if (!p) return [];
  const meses = edadEnMeses(p.birthDate, hoy);
  const enviados = new Set(db.materialDeliveries.filter((e) => e.patientId === patientId && !e.archivedAt).map((e) => e.materialId));
  return biblioteca(db).filter((m) => sirveParaEdad(m, meses) && !enviados.has(m.id));
}

export function enviadosA(db: Database, patientId: ID) {
  return db.materialDeliveries
    .filter((e) => e.patientId === patientId && !e.archivedAt)
    .map((envio) => ({ envio, material: db.educationalMaterials.find((m) => m.id === envio.materialId) }))
    .filter((x): x is { envio: typeof x.envio; material: EducationalMaterial } => !!x.material)
    .sort((a, b) => b.envio.sentAt.localeCompare(a.envio.sentAt));
}

/** "0 a 12 meses", "Desde 2 años", "Cualquier edad". */
export function textoEdades(m: Pick<EducationalMaterial, 'ageFromMonths' | 'ageToMonths'>): string {
  const t = (n: number) => (n >= 24 && n % 12 === 0 ? `${n / 12} años` : `${n} ${n === 1 ? 'mes' : 'meses'}`);
  const { ageFromMonths: d, ageToMonths: h } = m;
  if (d === undefined && h === undefined) return 'Cualquier edad';
  if (d !== undefined && h !== undefined) return `${t(d)} a ${t(h)}`;
  return d !== undefined ? `Desde ${t(d)}` : `Hasta ${t(h!)}`;
}

/** Enlace aceptable: https, para no abrir cualquier cosa. */
export const enlaceValido = (u: string) => /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(u.trim());
