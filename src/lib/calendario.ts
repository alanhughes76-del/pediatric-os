/**
 * Cuentas del calendario para elegir fechas (lógica pura, con tests). Semana de lunes a domingo.
 * Las fechas van como 'AAAA-MM-DD' adentro y como "dd/mm/aaaa" en los campos.
 */
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const dos = (n: number) => String(n).padStart(2, '0');
export const isoDe = (anio: number, mes: number, dia: number) => `${anio}-${dos(mes + 1)}-${dos(dia)}`;
/** 'AAAA-MM-DD' → "dd/mm/aaaa". */
export const aCampo = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "dd/mm/aaaa" (también d/m/aaaa) → 'AAAA-MM-DD', o null si no es una fecha válida. */
export function deCampo(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d ? isoDe(a, mes - 1, d) : null;
}

export const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();

/**
 * Las celdas del mes: `null` para los huecos antes del día 1 (la semana arranca el lunes) y al final,
 * hasta completar semanas enteras.
 */
export function celdasDelMes(anio: number, mes: number): (number | null)[] {
  const primero = new Date(Date.UTC(anio, mes, 1)).getUTCDay(); // 0 = domingo
  const huecos = (primero + 6) % 7;
  const celdas: (number | null)[] = Array.from({ length: huecos }, () => null);
  for (let d = 1; d <= diasDelMes(anio, mes); d += 1) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

/** Mes anterior o siguiente: { anio, mes } con mes 0–11. */
export function moverMes(anio: number, mes: number, delta: number) {
  const total = anio * 12 + mes + delta;
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

/** "lunes 20 de octubre de 2026" (para los lectores de pantalla). */
export function fechaParaLeer(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = DIAS_LARGOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${dia} ${d} de ${MESES[m - 1]} de ${a}`;
}

/** ¿La fecha está dentro de los límites (inclusive)? */
export const dentro = (iso: string, minimo?: string, maximo?: string) => (!minimo || iso >= minimo) && (!maximo || iso <= maximo);
