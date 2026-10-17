/**
 * Control de duplicados al dar de alta un paciente (prompt maestro, regla 8):
 * antes de guardar se compara por DNI y por apellido más fecha de nacimiento.
 * - Mismo DNI: es el mismo paciente → no se guarda.
 * - Mismo apellido y fecha de nacimiento: posible duplicado → se avisa y se confirma
 *   (pueden ser mellizos: decisión del Dr. en la etapa A).
 * Lógica pura: la usan la pantalla de alta y la Cloud Function `crearPaciente`.
 */

/** Minúsculas y sin tildes: "Núñez" → "nunez". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Solo los dígitos del DNI: "58.912.345" → "58912345". Vacío si no tiene dígitos. */
export function soloDigitos(texto: string | undefined | null): string {
  return (texto ?? '').replace(/\D/g, '');
}

export interface PacienteComparable {
  id: string;
  lastName: string;
  birthDate: string;
  dni?: string | null;
  archivedAt?: unknown;
}

export interface ResultadoDuplicados<T> {
  /** Mismo DNI: bloquea el alta. */
  mismoDni: T[];
  /** Mismo apellido y fecha de nacimiento (y DNI distinto o sin cargar): pide confirmación. */
  posibles: T[];
}

export function buscarDuplicados<T extends PacienteComparable>(
  pacientes: T[],
  nuevo: { lastName: string; birthDate: string; dni?: string | null },
): ResultadoDuplicados<T> {
  const activos = pacientes.filter((p) => !p.archivedAt);
  const dni = soloDigitos(nuevo.dni);
  const mismoDni = dni ? activos.filter((p) => soloDigitos(p.dni) === dni) : [];
  const apellido = normalizar(nuevo.lastName);
  const posibles = activos.filter(
    (p) => !mismoDni.includes(p) && normalizar(p.lastName) === apellido && p.birthDate === nuevo.birthDate,
  );
  return { mismoDni, posibles };
}
