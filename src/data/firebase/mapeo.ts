/**
 * Traducción entre las tablas de la app (src/data/types.ts) y Firestore (docs/MODELO_DE_DATOS.md).
 * Lógica pura, con tests.
 */
import type { Database } from '../types';

export type Tabla = Exclude<keyof Database, 'doctor' | 'auditLog'>;
type Fila = { id: string } & Record<string, unknown>;

/** Tablas clínicas: subcolección de clinical/{patientId}. */
export const CLINICAS: Partial<Record<Tabla, string>> = {
  problems: 'problems',
  allergies: 'allergies',
  consultations: 'consultations',
  measurements: 'growth',
  milestoneChecks: 'milestones',
  notes: 'notes',
  followUps: 'followUps',
  carePlan: 'carePlan',
  fever: 'fever',
  certificates: 'certificates',
  documents: 'documents',
};

/** Tablas administrativas: colección directa de la organización. */
export const ADMINISTRATIVAS: Tabla[] = ['families', 'guardians', 'relationships', 'patients', 'memberships', 'payments'];

export const TABLAS: Tabla[] = [...ADMINISTRATIVAS, 'addresses', ...(Object.keys(CLINICAS) as Tabla[])];

/** Ruta del documento de una fila. */
export function ruta(org: string, tabla: Tabla, fila: Fila): string {
  const base = `organizations/${org}`;
  const sub = CLINICAS[tabla];
  if (sub) {
    if (typeof fila.patientId !== 'string') throw new Error(`Falta el paciente para guardar en ${tabla}.`);
    return `${base}/clinical/${fila.patientId}/${sub}/${fila.id}`;
  }
  if (tabla === 'addresses') {
    if (typeof fila.guardianId !== 'string') throw new Error('Falta el adulto para guardar el domicilio.');
    return `${base}/guardians/${fila.guardianId}/addresses/${fila.id}`;
  }
  return `${base}/${tabla}/${fila.id}`;
}

/** Nombre de la colección en Firestore (para las consultas por grupo). */
export const coleccion = (tabla: Tabla) => CLINICAS[tabla] ?? tabla;

/** Campos que se llaman distinto en la app y en Firestore. */
const RENOMBRES: Partial<Record<Tabla, Record<string, string>>> = {
  guardians: { accessEnabled: 'portalEnabled' },
};

/** Fila de la app → datos de Firestore (sin `id` ni campos vacíos). */
export function aFirestore(tabla: Tabla, fila: Record<string, unknown>): Record<string, unknown> {
  const ren = RENOMBRES[tabla] ?? {};
  return Object.fromEntries(
    Object.entries(fila)
      .filter(([k, v]) => k !== 'id' && v !== undefined)
      .map(([k, v]) => [ren[k] ?? k, v]),
  );
}

/** Datos de Firestore → fila de la app. */
export function desdeFirestore(tabla: Tabla, id: string, datos: Record<string, unknown>): Fila {
  const ren = RENOMBRES[tabla] ?? {};
  const inverso = Object.fromEntries(Object.entries(ren).map(([a, f]) => [f, a]));
  return { id, ...Object.fromEntries(Object.entries(datos).map(([k, v]) => [inverso[k] ?? k, v])) };
}

export interface Cambio {
  tabla: Tabla;
  tipo: 'crear' | 'modificar';
  fila: Fila;
  /** Solo en 'modificar': campo → valor nuevo (undefined = se borra el campo). */
  cambios?: Record<string, unknown>;
}

/**
 * Qué cambió entre dos versiones de la base (para escribir en Firestore lo que hizo un `enLote`).
 * Las filas que desaparecen no se borran: nada se borra, se archiva.
 */
export function diferencias(antes: Database, despues: Database): Cambio[] {
  const lista: Cambio[] = [];
  for (const tabla of TABLAS) {
    const previas = new Map((antes[tabla] as unknown as Fila[]).map((f) => [f.id, f]));
    for (const fila of despues[tabla] as unknown as Fila[]) {
      const previa = previas.get(fila.id);
      if (!previa) {
        lista.push({ tabla, tipo: 'crear', fila });
        continue;
      }
      if (previa === fila) continue;
      const cambios: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(previa), ...Object.keys(fila)])) {
        if (k !== 'id' && JSON.stringify(previa[k]) !== JSON.stringify(fila[k])) cambios[k] = fila[k];
      }
      if (Object.keys(cambios).length > 0) lista.push({ tabla, tipo: 'modificar', fila, cambios });
    }
  }
  return lista;
}
