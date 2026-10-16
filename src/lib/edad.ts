/**
 * Edad cronológica y edad corregida.
 * Regla: si nació antes de las 37 semanas, se muestra también la edad corregida
 * hasta que cumple 2 años de edad cronológica.
 * Edad corregida = edad cronológica − (40 semanas − edad gestacional al nacer).
 */
import { hoyISO, partes, sumarDias, diasEntre } from './fechas';
import type { Patient } from '@/data/types';

interface Diferencia { anios: number; meses: number; dias: number; totalMeses: number; totalDias: number }

/** Diferencia calendario entre dos fechas (desde <= hasta). */
export function diferencia(desde: string, hasta: string): Diferencia {
  const a = partes(desde);
  const b = partes(hasta);
  let anios = b.a - a.a;
  let meses = b.m - a.m;
  let dias = b.d - a.d;
  if (dias < 0) {
    meses -= 1;
    // días del mes anterior a "hasta"
    dias += new Date(Date.UTC(b.a, b.m - 1, 0)).getUTCDate();
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  return { anios, meses, dias, totalMeses: anios * 12 + meses, totalDias: diasEntre(desde, hasta) };
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Texto legible: "18 días", "8 meses y 3 días", "3 años y 5 meses". */
export function formatearEdad(d: Diferencia): string {
  if (d.totalMeses < 1) return plural(d.totalDias, 'día', 'días');
  if (d.totalMeses < 24) {
    const m = plural(d.totalMeses, 'mes', 'meses');
    return d.dias > 0 ? `${m} y ${plural(d.dias, 'día', 'días')}` : m;
  }
  const a = plural(d.anios, 'año', 'años');
  return d.meses > 0 ? `${a} y ${plural(d.meses, 'mes', 'meses')}` : a;
}

/**
 * Formato del lado del médico: desde los 12 meses abreviado ("2a 3m 5d");
 * antes, escrito ("10 meses y 9 días", "18 días").
 */
export function formatearEdadAbreviada(d: Diferencia): string {
  if (d.totalMeses < 12) return formatearEdad(d);
  return `${d.anios}a ${d.meses}m ${d.dias}d`;
}

/** 'escrito' para las familias; 'abreviado' para el médico. */
export type FormatoEdad = 'escrito' | 'abreviado';

type ConEG = Pick<Patient, 'birthDate' | 'gestationalWeeks' | 'gestationalDays'>;

/** Edad gestacional al nacer en días. Si quedó vacía, se toma como de término (40 semanas). */
export function egEnDias(p: Pick<Patient, 'gestationalWeeks' | 'gestationalDays'>): number {
  return p.gestationalWeeks == null ? 280 : p.gestationalWeeks * 7 + (p.gestationalDays ?? 0);
}

export function esPrematuro(p: Pick<Patient, 'gestationalWeeks'>): boolean {
  return p.gestationalWeeks != null && p.gestationalWeeks < 37;
}

export function textoEG(p: Pick<Patient, 'gestationalWeeks' | 'gestationalDays'>): string {
  if (p.gestationalWeeks == null) return 'De término (sin dato)';
  return p.gestationalDays ? `${p.gestationalWeeks}+${p.gestationalDays} semanas` : `${p.gestationalWeeks} semanas`;
}

export interface Edades {
  cronologica: string;
  /** Presente solo si corresponde mostrarla. */
  corregida?: string;
}

/** Se usa la edad corregida si nació antes de las 37 semanas, hasta los 24 meses de edad cronológica. */
export function usaEdadCorregida(p: ConEG, fecha = hoyISO()): boolean {
  return esPrematuro(p) && diferencia(p.birthDate, fecha).anios < 2;
}

export function edades(p: ConEG, hoy = hoyISO(), formato: FormatoEdad = 'escrito'): Edades {
  const formatear = formato === 'abreviado' ? formatearEdadAbreviada : formatearEdad;
  const crono = diferencia(p.birthDate, hoy);
  const res: Edades = { cronologica: formatear(crono) };
  if (!usaEdadCorregida(p, hoy)) return res;

  const fechaTermino = sumarDias(p.birthDate, 280 - egEnDias(p));
  if (diasEntre(fechaTermino, hoy) < 0) {
    // Todavía no llegó a las 40 semanas: se informa la edad gestacional corregida.
    const egHoy = egEnDias(p) + crono.totalDias;
    res.corregida = `${Math.floor(egHoy / 7)}+${egHoy % 7} semanas de edad gestacional`;
  } else {
    res.corregida = formatear(diferencia(fechaTermino, hoy));
  }
  return res;
}

/** Edad en meses (decimal) en una fecha dada; para el eje X de los gráficos. */
export function edadEnMeses(fechaNacimiento: string, fecha: string): number {
  return diasEntre(fechaNacimiento, fecha) / 30.4375;
}

export type EdadCalculo =
  | { ok: true; meses: number; corregida: boolean }
  | { ok: false; motivo: 'antes-de-nacer' | 'antes-del-termino' };

/**
 * Edad en meses para percentilos e hitos en una fecha.
 * Prematuros: hasta los 24 meses se usa la edad corregida.
 */
export function edadParaCalculo(p: ConEG, fecha: string): EdadCalculo {
  const dias = diasEntre(p.birthDate, fecha);
  if (dias < 0) return { ok: false, motivo: 'antes-de-nacer' };
  if (!usaEdadCorregida(p, fecha)) return { ok: true, meses: dias / 30.4375, corregida: false };
  const corregidos = dias - (280 - egEnDias(p));
  if (corregidos < 0) return { ok: false, motivo: 'antes-del-termino' };
  return { ok: true, meses: corregidos / 30.4375, corregida: true };
}
