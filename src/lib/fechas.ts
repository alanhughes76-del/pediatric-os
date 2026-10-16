/** Utilidades de fechas. Trabajamos con días calendario 'AAAA-MM-DD'. */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha de hoy en hora local, como 'AAAA-MM-DD'. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Convierte 'AAAA-MM-DD' (o una fecha y hora ISO) a {a, m, d}. */
export function partes(fecha: string) {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return { a, m, d };
}

function aUTC(fecha: string) {
  const { a, m, d } = partes(fecha);
  return Date.UTC(a, m - 1, d);
}

export function sumarDias(fecha: string, dias: number): string {
  const t = new Date(aUTC(fecha) + dias * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aUTC(hasta) - aUTC(desde)) / 86400000);
}

/** "16 de octubre de 2026" */
export function fechaLarga(fecha: string): string {
  const { a, m, d } = partes(fecha);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** "16/10/2026" */
export function fechaCorta(fecha: string): string {
  const { a, m, d } = partes(fecha);
  return `${pad(d)}/${pad(m)}/${a}`;
}

/** "Miércoles 21 de octubre" */
export function diaYFecha(fecha: string): string {
  const { a, m, d } = partes(fecha);
  const dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d} de ${MESES[m - 1]}`;
}

/** "10:30" a partir de una fecha y hora ISO (se toma la hora tal cual fue cargada). */
export function hora(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

/** "Hoy", "Mañana" o "Miércoles 21 de octubre". */
export function cuandoEs(fecha: string): string {
  const dif = diasEntre(hoyISO(), fecha);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Mañana';
  return diaYFecha(fecha);
}

// ---------- Fecha y hora ----------

/** Desfase horario local, por ejemplo "-03:00". */
function desfase(d: Date): string {
  const min = -d.getTimezoneOffset();
  const signo = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  return `${signo}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Fecha y hora local en ISO con zona: '2026-10-16T14:30:00-03:00'. */
export function aISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${desfase(d)}`;
}

export function ahoraISO(): string {
  return aISO(new Date());
}

/** Fecha y hora relativa a hoy, para los datos de ejemplo: enDias(-2, '21:10'). */
export function enDias(dias: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(h, m, 0, 0);
  return aISO(d);
}

export function sumarHoras(iso: string, horas: number): string {
  return aISO(new Date(Date.parse(iso) + horas * 3600000));
}

/** Horas (con decimales) de `desde` a `hasta`. */
export function horasEntre(desde: string, hasta: string): number {
  return (Date.parse(hasta) - Date.parse(desde)) / 3600000;
}

/** Campos editables "dd/mm/aaaa" y "hh:mm" a partir de un ISO. */
export function aCampos(iso: string): { fecha: string; hora: string } {
  const { a, m, d } = partes(iso);
  return { fecha: `${pad(d)}/${pad(m)}/${a}`, hora: iso.slice(11, 16) };
}

/** "dd/mm/aaaa" + "hh:mm" → ISO local, o null si no es una fecha válida. */
export function deCampos(fecha: string, horaTxt: string): string | null {
  const f = fecha.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const h = horaTxt.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!f || !h) return null;
  const d = new Date(Number(f[3]), Number(f[2]) - 1, Number(f[1]), Number(h[1]), Number(h[2]));
  if (d.getDate() !== Number(f[1]) || d.getMonth() !== Number(f[2]) - 1 || Number(h[1]) > 23 || Number(h[2]) > 59) return null;
  return aISO(d);
}

/** "16/10 14:30" */
export function fechaHoraCorta(iso: string): string {
  const { m, d } = partes(iso);
  return `${pad(d)}/${pad(m)} ${hora(iso)}`;
}

/** "en 5 h", "en 2 días", "hace 3 h"… */
export function duracion(horas: number): string {
  const abs = Math.abs(horas);
  if (abs < 1) return `${Math.max(1, Math.round(abs * 60))} min`;
  if (abs < 48) return `${Math.round(abs)} h`;
  return `${Math.round(abs / 24)} días`;
}
