/**
 * Configuración de la práctica (prompt maestro 7.21): valores iniciales y cuentas simples.
 * Los valores reales los carga el Dr. en Configuración (en Firebase: settings/links y settings/precios).
 */
import { CONFIG } from '@/config';
import { TIPOS_TURNO, type ConfigAgenda, type Franja, type TipoTurno } from '@shared/agenda';
import type { Currency, Links, Plan, Precios } from './types';

/** Links de arranque: los de src/config.ts, hasta que el Dr. los cambie. */
export const LINKS_INICIALES: Links = {
  pacienteXUrl: CONFIG.pacienteXUrl,
  calControlUrl: CONFIG.calControlUrl,
  calUrgenciaUrl: CONFIG.calUrgenciaUrl,
  recetasNombre: CONFIG.recetasNombre,
  recetasUrl: CONFIG.recetasUrl,
};

/** Valores que pasó el Dr. (prompt maestro 7.16) como configuración inicial. */
export const PRECIOS_INICIALES: Precios = {
  membresia: {
    anual: 2000,
    semestral: 1000,
    moneda: 'USD',
    descuentoHijoAdicionalPct: 50,
    conversion: 'Si se paga en pesos: promedio del dólar oficial BNA comprador y vendedor del día.',
  },
  visitas: {
    controlOUrgenciaDia: 150000,
    hermanoMismaVisita: 100000,
    urgenciaNocheFinDeSemanaFeriado: 190000,
    prenatalVideollamada: 70000,
    prenatalDomicilio: 150000,
  },
  prenatalDescuentaDias: 30,
};

/** Completa lo que falte de un documento guardado con los valores iniciales. */
export function conPrecios(guardado: Partial<Precios> | undefined): Precios {
  return {
    membresia: { ...PRECIOS_INICIALES.membresia, ...(guardado?.membresia ?? {}) },
    visitas: { ...PRECIOS_INICIALES.visitas, ...(guardado?.visitas ?? {}) },
    prenatalDescuentaDias: guardado?.prenatalDescuentaDias ?? PRECIOS_INICIALES.prenatalDescuentaDias,
  };
}

export const conLinks = (guardado: Partial<Links> | undefined): Links => ({ ...LINKS_INICIALES, ...(guardado ?? {}) });

/**
 * Precio de lista de una membresía. Anual: precio por familia y, por cada hijo adicional, el
 * descuento configurado. Semestral: el precio cargado (el Dr. no definió descuento por hermano).
 */
export function precioMembresia(precios: Precios, plan: Plan, hijos: number): { monto: number; moneda: Currency; detalle: string } {
  const { anual, semestral, moneda, descuentoHijoAdicionalPct } = precios.membresia;
  if (plan === 'semestral') return { monto: semestral, moneda, detalle: 'Plan semestral' };
  const adicionales = Math.max(0, hijos - 1);
  const porAdicional = anual * (1 - descuentoHijoAdicionalPct / 100);
  const monto = Math.round(anual + adicionales * porAdicional);
  const detalle = adicionales === 0
    ? 'Plan anual, un hijo'
    : `Plan anual: ${dinero(anual, moneda)} + ${adicionales} ${adicionales === 1 ? 'hijo adicional' : 'hijos adicionales'} con ${descuentoHijoAdicionalPct} % de descuento`;
  return { monto, moneda, detalle };
}

/** "USD 2.000" o "$ 150.000". */
export const dinero = (monto: number, moneda: Currency) => `${moneda === 'USD' ? 'USD' : '$'} ${monto.toLocaleString('es-AR')}`;

/** Fecha de renovación sugerida: un año (o seis meses) después del alta. */
export function renovacionSugerida(desde: string, plan: Plan): string {
  const [a, m, d] = desde.split('-').map(Number);
  const meses = plan === 'anual' ? 12 : 6;
  const fecha = new Date(Date.UTC(a, m - 1 + meses, d));
  // Si el día no existe en ese mes (31 → 30), queda el último día del mes.
  if (fecha.getUTCDate() !== d) fecha.setUTCDate(0);
  return fecha.toISOString().slice(0, 10);
}

/** Validación simple de un link: vacío, o https. */
export const validarLink = (v: string) => (!v.trim() || /^https:\/\/\S+$/.test(v.trim()) ? undefined : 'Tiene que empezar con https://');

/** "1.500,5" o "1500" → número; vacío o inválido → NaN. */
export const aNumero = (v: string) => Number(v.replace(/\./g, '').replace(',', '.').trim() || 'x');

/** HH:MM válida (00:00 a 23:59). */
export const esHora = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim());

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// En la pantalla, la semana arranca el lunes.
export const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

/** Revisa el formulario y devuelve la configuración, o un mensaje de error. */
export function armarAgenda(p: {
  horarios: Record<number, Franja[]>;
  duraciones: Record<TipoTurno, string>;
  buffer: string;
  zonas: { nombre: string; localidades: string }[];
}): ConfigAgenda | string {
  for (const d of ORDEN_DIAS) {
    for (const f of p.horarios[d] ?? []) {
      if (!esHora(f.desde) || !esHora(f.hasta)) return `${DIAS[d]}: las horas van como 09:00.`;
      if (f.desde >= f.hasta) return `${DIAS[d]}: el horario de fin tiene que ser después del de inicio.`;
    }
  }
  const duracionMin = Object.fromEntries(TIPOS_TURNO.map((t) => [t, aNumero(p.duraciones[t])])) as Record<TipoTurno, number>;
  if (Object.values(duracionMin).some((n) => !Number.isInteger(n) || n < 5 || n > 240)) return 'Cada duración va en minutos, entre 5 y 240.';
  const bufferMin = aNumero(p.buffer);
  if (!Number.isInteger(bufferMin) || bufferMin < 0 || bufferMin > 180) return 'El buffer de traslado va en minutos, entre 0 y 180.';
  const zonas = p.zonas
    .map((z) => ({ nombre: z.nombre.trim(), localidades: z.localidades.split(',').map((x) => x.trim()).filter(Boolean) }))
    .filter((z) => z.nombre || z.localidades.length);
  if (zonas.some((z) => !z.nombre)) return 'Cada zona necesita un nombre.';
  const horarios = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, (p.horarios[d] ?? []).map((f) => ({ desde: f.desde.trim(), hasta: f.hasta.trim() }))]));
  return { horarios, duracionMin, bufferMin, zonas };
}
