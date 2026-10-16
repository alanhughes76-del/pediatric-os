/**
 * Percentilos de crecimiento con el método LMS.
 *
 * Referencias:
 * - OMS 2006/2007 (oms_lms.json): peso/edad, talla/edad, PC/edad, IMC/edad y peso/talla.
 * - SAP/Lejarraga 2009 (argentina_lms.json): peso/edad y talla/edad.
 * En los dos archivos el sexo va como M o F y "t" es la edad en meses
 * (en peso/talla, "t" es la talla en cm).
 *
 * Reglas:
 * - OMS hasta los 60 meses. Peso y talla después de los 60 meses: referencia argentina.
 * - PC, IMC y peso/talla: siempre OMS.
 * - Prematuros: hasta los 24 meses se usa la edad corregida (ver `edadParaCalculo`).
 */
import oms from '@/data/referencias/oms_lms.json';
import argentina from '@/data/referencias/argentina_lms.json';

export interface FilaLMS { t: number; L: number; M: number; S: number }
type SexoRef = 'M' | 'F';

export type Indicador = 'peso' | 'talla' | 'pc' | 'imc' | 'peso-talla';

export const INDICADORES: { clave: Indicador; nombre: string; corto: string; unidad: string }[] = [
  { clave: 'peso', nombre: 'Peso para la edad', corto: 'Peso', unidad: 'kg' },
  { clave: 'talla', nombre: 'Talla para la edad', corto: 'Talla', unidad: 'cm' },
  { clave: 'pc', nombre: 'Perímetro cefálico para la edad', corto: 'PC', unidad: 'cm' },
  { clave: 'imc', nombre: 'IMC para la edad', corto: 'IMC', unidad: 'kg/m²' },
  { clave: 'peso-talla', nombre: 'Peso para la talla', corto: 'Peso/talla', unidad: 'kg' },
];

export type Referencia = 'OMS' | 'SAP';

export interface TablaElegida {
  filas: FilaLMS[];
  referencia: Referencia;
  /** Etiqueta para mostrar: "OMS", "OMS (acostado)", "SAP/Lejarraga". */
  etiqueta: string;
}

/**
 * Elige la tabla según indicador, sexo y edad (meses).
 * Devuelve null si no hay referencia para esa edad (por ejemplo, PC después de los 5 años).
 */
export function elegirTabla(ind: Indicador, sexo: SexoRef, meses: number): TablaElegida | null {
  switch (ind) {
    case 'peso':
      return meses <= 60
        ? { filas: oms.peso_edad[sexo], referencia: 'OMS', etiqueta: 'OMS' }
        : { filas: argentina.peso_edad[sexo], referencia: 'SAP', etiqueta: 'SAP/Lejarraga' };
    case 'talla':
      if (meses > 60) return { filas: argentina.talla_edad[sexo], referencia: 'SAP', etiqueta: 'SAP/Lejarraga' };
      return meses < 24
        ? { filas: oms.talla_edad[sexo].acostado, referencia: 'OMS', etiqueta: 'OMS (acostado)' }
        : { filas: oms.talla_edad[sexo].de_pie, referencia: 'OMS', etiqueta: 'OMS (de pie)' };
    case 'pc':
      return meses <= 60 ? { filas: oms.pc_edad[sexo], referencia: 'OMS', etiqueta: 'OMS' } : null;
    case 'imc':
      return { filas: oms.imc_edad[sexo], referencia: 'OMS', etiqueta: 'OMS' };
    case 'peso-talla':
      return meses < 24
        ? { filas: oms.peso_talla[sexo].acostado, referencia: 'OMS', etiqueta: 'OMS (acostado)' }
        : { filas: oms.peso_talla[sexo].de_pie, referencia: 'OMS', etiqueta: 'OMS (de pie)' };
  }
}

/** L, M y S en `t`, interpolando linealmente entre las filas de la tabla. */
export function lmsEn(filas: FilaLMS[], t: number): FilaLMS | null {
  if (filas.length === 0 || t < filas[0].t || t > filas[filas.length - 1].t) return null;
  let i = 0;
  while (i < filas.length - 1 && filas[i + 1].t < t) i++;
  const a = filas[i];
  const b = filas[Math.min(i + 1, filas.length - 1)];
  if (b.t === a.t) return a;
  const f = (t - a.t) / (b.t - a.t);
  return { t, L: a.L + (b.L - a.L) * f, M: a.M + (b.M - a.M) * f, S: a.S + (b.S - a.S) * f };
}

/** Z = ((X/M)^L − 1) / (L·S); si L = 0, Z = ln(X/M)/S. */
export function zScore(x: number, { L, M, S }: FilaLMS): number {
  return Math.abs(L) < 1e-9 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S);
}

/** Valor de la medida para un Z dado (para dibujar las curvas). */
export function valorParaZ(z: number, { L, M, S }: FilaLMS): number {
  return Math.abs(L) < 1e-9 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

/** Función de distribución normal estándar (Φ). */
export function normalCDF(z: number): number {
  // Abramowitz y Stegun 7.1.26 (error < 1,5·10⁻⁷)
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Z de los percentilos de las curvas. */
export const CURVAS: { p: number; z: number }[] = [
  { p: 3, z: -1.8808 }, { p: 10, z: -1.2816 }, { p: 25, z: -0.6745 }, { p: 50, z: 0 },
  { p: 75, z: 0.6745 }, { p: 90, z: 1.2816 }, { p: 97, z: 1.8808 },
];

/** Límites físicos: fuera de esto, la medida es imposible (casi seguro un error de tipeo). */
const LIMITES: Record<Indicador, [number, number]> = {
  peso: [0.3, 200],
  talla: [20, 230],
  pc: [18, 70],
  imc: [5, 80],
  'peso-talla': [0.3, 200],
};

/** A partir de este |Z| se avisa un posible error de tipeo. */
export const Z_EXTREMO = 4;

export type Aviso = 'imposible' | 'z-extremo';

export type ResultadoPercentil =
  | { ok: true; z: number; percentil: number; referencia: Referencia; etiqueta: string; aviso?: Aviso }
  | { ok: false; motivo: 'sin-referencia' | 'fuera-de-rango' | 'imposible' };

/**
 * Calcula Z y percentilo de una medida.
 * `t` es la edad en meses (o la talla en cm para peso/talla).
 * `mesesEdad` decide qué tabla usar (en peso/talla, acostado o de pie).
 */
export function calcular(ind: Indicador, sexo: SexoRef, valor: number, mesesEdad: number, t = mesesEdad): ResultadoPercentil {
  const [min, max] = LIMITES[ind];
  if (!(valor >= min && valor <= max)) return { ok: false, motivo: 'imposible' };
  const tabla = elegirTabla(ind, sexo, mesesEdad);
  if (!tabla) return { ok: false, motivo: 'sin-referencia' };
  const lms = lmsEn(tabla.filas, t);
  if (!lms) return { ok: false, motivo: 'fuera-de-rango' };
  const z = zScore(valor, lms);
  return {
    ok: true,
    z,
    percentil: normalCDF(z) * 100,
    referencia: tabla.referencia,
    etiqueta: tabla.etiqueta,
    aviso: Math.abs(z) >= Z_EXTREMO ? 'z-extremo' : undefined,
  };
}

export function imc(pesoKg: number, tallaCm: number): number {
  return pesoKg / Math.pow(tallaCm / 100, 2);
}

// ---------- Formato ----------

const coma = (n: number, dec: number) => n.toFixed(dec).replace('.', ',');

/** "P42", "P0,4", "<P0,1", ">P99,9" */
export function formatoPercentil(p: number): string {
  if (p < 0.1) return '<P0,1';
  if (p > 99.9) return '>P99,9';
  if (p < 1 || p > 99) return `P${coma(p, 1)}`;
  return `P${Math.round(p)}`;
}

/** "+1,23" / "−0,45" */
export function formatoZ(z: number): string {
  return `${z >= 0 ? '+' : '−'}${coma(Math.abs(z), 2)}`;
}

export const TEXTO_MOTIVO: Record<'sin-referencia' | 'fuera-de-rango' | 'imposible', string> = {
  'sin-referencia': 'Sin referencia para esta edad',
  'fuera-de-rango': 'Fuera del rango de la tabla',
  imposible: 'Medida imposible: revisá si hay un error de tipeo',
};

/** Convierte lo que se escribe ("8,25") a número, o undefined si está vacío o no es válido. */
export function leerNumero(texto: string): number | undefined {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}
