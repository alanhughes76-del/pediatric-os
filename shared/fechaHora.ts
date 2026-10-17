/**
 * Fecha y hora en el formato de la app: hora de Argentina con zona, al minuto
 * ('2026-10-17T10:00:00-03:00'). El servidor escribe así todo lo que la app compara
 * con su propia hora (vencimientos, aprobaciones), para que las comparaciones sean correctas.
 * Argentina usa UTC−3 todo el año.
 */
const pad = (n: number) => String(n).padStart(2, '0');

export function isoArgentina(ms: number = Date.now()): string {
  const d = new Date(ms - 3 * 3_600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00-03:00`;
}
