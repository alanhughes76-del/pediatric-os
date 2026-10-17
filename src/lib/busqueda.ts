/**
 * Lista de pacientes: ámbitos, orden y búsqueda. Lógica pura, sin interfaz.
 *
 * La búsqueda no distingue mayúsculas ni tildes y encuentra por:
 * - nombre, apellido o ambos en cualquier orden ("tomas ruiz", "ruiz tomas");
 * - iniciales ("tr", "trf");
 * - fecha de nacimiento dd/mm/aaaa (también parcial: "12/05" o "2023").
 */
import type { Patient, Scope } from '@/data/types';

export type Solapa = 'todos' | Scope;

export const SOLAPAS: { clave: Solapa; texto: string }[] = [
  { clave: 'todos', texto: 'Todos' },
  { clave: 'membresia', texto: 'Membresía' },
  { clave: 'cardales', texto: 'Cardales' },
  { clave: 'hepta', texto: 'Hepta' },
  { clave: 'esporadico', texto: 'Esporádicos' },
  { clave: 'sin-asignar', texto: 'Sin asignar' },
];

/** Nombre del ámbito para la etiqueta de cada fila. */
export const TEXTO_AMBITO: Record<Scope, string> = {
  membresia: 'Membresía',
  cardales: 'Cardales',
  hepta: 'Hepta',
  esporadico: 'Esporádico',
  'sin-asignar': 'Sin asignar',
};

/** Minúsculas y sin tildes: "Núñez" → "nunez". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const activos = (lista: Patient[]) => lista.filter((p) => !p.archivedAt);

/** Orden alfabético por apellido y después por nombre (sin distinguir tildes). */
export function ordenarPorApellido(lista: Patient[]): Patient[] {
  const comparar = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });
  return [...lista].sort((a, b) => comparar(a.lastName, b.lastName) || comparar(a.firstName, b.firstName));
}

/** Fecha de nacimiento como "dd/mm/aaaa". */
function fechaNacimiento(p: Patient): string {
  const [a, m, d] = p.birthDate.split('-');
  return `${d}/${m}/${a}`;
}

/** Completa con ceros una fecha escrita "1/5/2023" → "01/05/2023". */
function completarFecha(q: string): string {
  const partes = q.split('/');
  if (partes.length !== 3) return q;
  const [d, m, a] = partes;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${a}`;
}

function iniciales(p: Patient): string[] {
  const nombres = normalizar(p.firstName).split(/\s+/);
  const apellidos = normalizar(p.lastName).split(/\s+/);
  const n = nombres.map((x) => x[0]).join('');
  const a = apellidos.map((x) => x[0]).join('');
  // "tr" (primer nombre + primer apellido) y "trf" (todas las palabras)
  return [`${nombres[0][0]}${apellidos[0][0]}`, `${n}${a}`];
}

export function coincide(p: Patient, consulta: string): boolean {
  const q = normalizar(consulta);
  if (!q) return true;

  // DNI: solo números (con o sin puntos), 7 dígitos o más
  const digitos = q.replace(/[.\s]/g, '');
  if (/^\d{7,}$/.test(digitos)) return !!p.dni && p.dni.replace(/\D/g, '').includes(digitos);

  // Fecha de nacimiento
  if (/^[\d/]+$/.test(q)) return fechaNacimiento(p).includes(completarFecha(q));

  // Nombre y apellido, en cualquier orden
  const completo = normalizar(`${p.firstName} ${p.lastName}`);
  const palabras = q.split(/\s+/);
  if (palabras.every((w) => completo.includes(w))) return true;

  // Iniciales
  if (palabras.length === 1 && /^[a-z]{2,4}$/.test(q)) return iniciales(p).some((i) => i === q);
  return false;
}

/** Pacientes de una solapa que coinciden con la búsqueda, en orden alfabético. */
export function filtrarPacientes(lista: Patient[], solapa: Solapa, consulta: string): Patient[] {
  return ordenarPorApellido(activos(lista).filter((p) => (solapa === 'todos' || p.scope === solapa) && coincide(p, consulta)));
}

/** Cuántos pacientes tiene cada solapa (sin tener en cuenta la búsqueda). */
export function contarPorSolapa(lista: Patient[]): Record<Solapa, number> {
  const conteo: Record<Solapa, number> = { todos: 0, membresia: 0, cardales: 0, hepta: 0, esporadico: 0, 'sin-asignar': 0 };
  for (const p of activos(lista)) {
    conteo.todos++;
    conteo[p.scope]++;
  }
  return conteo;
}

/** Control de duplicados al dar de alta (regla 8): la lógica vive en shared/duplicados.ts. */
export { buscarDuplicados } from '@shared/duplicados';
