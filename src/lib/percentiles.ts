/**
 * Motor de percentilos de crecimiento (método LMS). Módulo puro, sin interfaz.
 * Lo usan la consulta (antropometría en vivo) y la tarjeta Crecimiento de la ficha.
 *
 * Referencias:
 * - OMS 2006/2007 (oms_lms.json): peso/edad (0–60 m), talla/edad (acostado 0–24 m, de pie 24–228 m),
 *   PC/edad (0–60 m), IMC/edad (0–228 m) y peso/talla (acostado 45–110 cm, de pie 65–120 cm).
 * - SAP/Lejarraga 2009, planilla del Garrahan (argentina_lms.json): peso/edad y talla/edad (0–228 m;
 *   de 0 a 24 m son los valores OMS). La talla es acostado hasta los 48 m y de pie desde los 48.
 * En los dos archivos el sexo va como M o F y "t" es la edad en meses (en peso/talla, la talla en cm).
 *
 * Reglas:
 * - Z = ((X/M)^L − 1) / (L·S); si L = 0, Z = ln(X/M) / S. Interpolación lineal de L, M y S.
 * - Percentilo = Φ(Z) × 100. Curvas: X = M·(1 + L·S·Z)^(1/L), o M·e^(S·Z) si L = 0.
 * - Fuera del rango de la tabla no se extrapola.
 * - Referencia por defecto: OMS hasta los 24 meses; peso y talla desde los 24 meses, SAP/Lejarraga
 *   (Garrahan). PC, IMC y peso/talla siempre OMS. Se puede pedir la otra referencia cuando exista.
 * - Talla (pedido del Dr., 28/10/2026, fuente Garrahan): se mide acostado antes de los 48 meses y de
 *   pie desde los 48. Cada tabla tiene su corte: OMS a los 24 meses, SAP a los 48. Si la medida no
 *   está en la posición de la tabla, se corrige 0,7 cm antes de calcular (de pie → acostado +0,7;
 *   acostado → de pie −0,7).
 * - Prematuros: hasta los 24 meses se usa la edad corregida (ver `edadParaCalculo` en edad.ts).
 * - Avisos (criterios OMS): |Z| > 3 → valor extremo; fuera de los límites de plausibilidad →
 *   probable error de carga.
 */
import oms from '@/data/referencias/oms_lms.json';
import argentina from '@/data/referencias/argentina_lms.json';

export interface FilaLMS { t: number; L: number; M: number; S: number }
export type SexoRef = 'M' | 'F';
export type Indicador = 'peso' | 'talla' | 'pc' | 'imc' | 'peso-talla';
export type Referencia = 'OMS' | 'SAP';
export type Posicion = 'acostado' | 'de_pie';

export const INDICADORES: { clave: Indicador; nombre: string; corto: string; unidad: string }[] = [
  { clave: 'peso', nombre: 'Peso para la edad', corto: 'Peso', unidad: 'kg' },
  { clave: 'talla', nombre: 'Talla para la edad', corto: 'Talla', unidad: 'cm' },
  { clave: 'pc', nombre: 'Perímetro cefálico para la edad', corto: 'PC', unidad: 'cm' },
  { clave: 'imc', nombre: 'IMC para la edad', corto: 'IMC', unidad: 'kg/m²' },
  { clave: 'peso-talla', nombre: 'Peso para la talla', corto: 'Peso/talla', unidad: 'kg' },
];

export interface TablaElegida {
  filas: FilaLMS[];
  referencia: Referencia;
  /** Etiqueta para mostrar: "OMS", "OMS (acostado)", "SAP/Lejarraga 2009 (Garrahan)". */
  etiqueta: string;
}

// ---------- Posición de la talla ----------

/** Corrección entre talla acostado y de pie (cm). */
export const CORRECCION_POSICION = 0.7;

/** Edad (meses) desde la que la talla se mide de pie. */
export const MESES_DE_PIE = 48;

/** Posición en que se mide la talla: acostado antes de los 4 años, de pie desde los 4. */
export const posicionPorEdad = (meses: number): Posicion => (meses < MESES_DE_PIE ? 'acostado' : 'de_pie');

/** Edad (meses) en que cada tabla de talla pasa de acostado a de pie: OMS a los 24, SAP a los 48. */
export const corteDeTalla = (referencia: Referencia): number => (referencia === 'SAP' ? MESES_DE_PIE : 24);

/** Posición de la tabla de esa referencia a esa edad. */
export const posicionDeLaTabla = (referencia: Referencia, meses: number): Posicion => (meses < corteDeTalla(referencia) ? 'acostado' : 'de_pie');

/**
 * Lleva una talla a la posición de la tabla de `referencia` (±0,7 cm).
 * Sin `medida`, se supone que se midió como corresponde a la edad.
 */
export function tallaParaReferencia(cm: number, medida: Posicion | undefined, meses: number, referencia: Referencia): number {
  const esperada = posicionDeLaTabla(referencia, meses);
  const real = medida ?? posicionPorEdad(meses);
  if (real === esperada) return cm;
  return esperada === 'acostado' ? cm + CORRECCION_POSICION : cm - CORRECCION_POSICION;
}

// ---------- Referencias ----------

/** Nombre de la referencia argentina para mostrar. */
export const NOMBRE_SAP = 'SAP/Lejarraga 2009 (Garrahan)';

/** Referencia por defecto: OMS hasta los 24 meses; peso y talla desde los 24, SAP/Lejarraga (Garrahan). */
export function referenciaPorDefecto(ind: Indicador, meses: number): Referencia {
  return (ind === 'peso' || ind === 'talla') && meses >= 24 ? 'SAP' : 'OMS';
}

/** Referencias que existen para ese indicador (peso y talla tienen OMS y SAP). */
export function referenciasDelIndicador(ind: Indicador): Referencia[] {
  return ind === 'peso' || ind === 'talla' ? ['OMS', 'SAP'] : ['OMS'];
}

/**
 * Elige la tabla según indicador, sexo, edad (meses) y referencia.
 * Devuelve null si esa referencia no existe para el indicador.
 */
export function elegirTabla(ind: Indicador, sexo: SexoRef, meses: number, referencia: Referencia = referenciaPorDefecto(ind, meses)): TablaElegida | null {
  if (referencia === 'SAP') {
    if (ind === 'peso') return { filas: argentina.peso_edad[sexo], referencia, etiqueta: NOMBRE_SAP };
    if (ind === 'talla') {
      const pos = posicionDeLaTabla('SAP', meses);
      return { filas: argentina.talla_edad[sexo], referencia, etiqueta: `${NOMBRE_SAP}, ${pos === 'acostado' ? 'acostado' : 'de pie'}` };
    }
    return null;
  }
  const pos = posicionDeLaTabla('OMS', meses);
  switch (ind) {
    case 'peso':
      return { filas: oms.peso_edad[sexo], referencia, etiqueta: 'OMS' };
    case 'talla':
      return { filas: oms.talla_edad[sexo][pos], referencia, etiqueta: pos === 'acostado' ? 'OMS (acostado)' : 'OMS (de pie)' };
    case 'pc':
      return { filas: oms.pc_edad[sexo], referencia, etiqueta: 'OMS' };
    case 'imc':
      return { filas: oms.imc_edad[sexo], referencia, etiqueta: 'OMS' };
    case 'peso-talla':
      return { filas: oms.peso_talla[sexo][pos], referencia, etiqueta: pos === 'acostado' ? 'OMS (acostado)' : 'OMS (de pie)' };
  }
}

// ---------- LMS ----------

/** L, M y S en `t`, interpolando linealmente entre los dos puntos más cercanos. Null fuera de rango. */
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

/** Z = ((X/M)^L − 1) / (L·S); si L = 0, Z = ln(X/M) / S. */
export function zScore(x: number, { L, M, S }: FilaLMS): number {
  return L === 0 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S);
}

/** X = M·(1 + L·S·Z)^(1/L), o M·e^(S·Z) si L = 0. */
export function valorParaZ(z: number, { L, M, S }: FilaLMS): number {
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

/** Función de distribución normal estándar Φ (Abramowitz y Stegun 7.1.26, error < 1,5·10⁻⁷). */
export function normalCDF(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Z de las curvas P3 a P97. */
export const CURVAS: { p: number; z: number }[] = [
  { p: 3, z: -1.8808 }, { p: 10, z: -1.2816 }, { p: 25, z: -0.6745 }, { p: 50, z: 0 },
  { p: 75, z: 0.6745 }, { p: 90, z: 1.2816 }, { p: 97, z: 1.8808 },
];

// ---------- Avisos ----------

/** |Z| por encima de esto: "valor extremo, revisá la medida". */
export const Z_EXTREMO = 3;

/** Límites de plausibilidad (criterios OMS): fuera de esto, probable error de carga. */
export const LIMITES_PLAUSIBLES: Record<Indicador, [number, number]> = {
  peso: [-6, 5],
  talla: [-6, 6],
  imc: [-5, 5],
  'peso-talla': [-5, 5],
  pc: [-5, 5], // la consigna no lo fija; se usa el criterio OMS para PC/edad
};

export type Aviso = 'extremo' | 'error-carga';

export const TEXTO_AVISO: Record<Aviso, string> = {
  extremo: 'Valor extremo, revisá la medida.',
  'error-carga': 'Probable error de carga.',
};

export function avisoPara(ind: Indicador, z: number): Aviso | undefined {
  const [min, max] = LIMITES_PLAUSIBLES[ind];
  if (z < min || z > max) return 'error-carga';
  if (Math.abs(z) > Z_EXTREMO) return 'extremo';
  return undefined;
}

// ---------- Cálculo ----------

export type Motivo = 'fuera-de-rango' | 'invalido';

export const TEXTO_MOTIVO: Record<Motivo, string> = {
  'fuera-de-rango': 'Fuera del rango de la referencia',
  invalido: 'Valor no válido',
};

export type ResultadoPercentil =
  | { ok: true; z: number; percentil: number; referencia: Referencia; etiqueta: string; valorUsado: number; aviso?: Aviso }
  | { ok: false; motivo: Motivo };

export interface Pedido {
  indicador: Indicador;
  sexo: SexoRef;
  /** Valor medido. Para talla, tal como se midió (la corrección por posición la hace el motor). */
  valor: number;
  /** Edad en meses (corregida si corresponde). */
  meses: number;
  /** Para peso/talla: la talla en cm (eje de la tabla). */
  tallaCm?: number;
  /** Posición en que se midió la talla (por defecto, la que corresponde a la edad). */
  posicion?: Posicion;
  /** Referencia elegida (por defecto, según la edad). */
  referencia?: Referencia;
}

export function calcular(p: Pedido): ResultadoPercentil {
  if (!(p.valor > 0) || (p.indicador === 'peso-talla' && !(p.tallaCm && p.tallaCm > 0))) return { ok: false, motivo: 'invalido' };
  const tabla = elegirTabla(p.indicador, p.sexo, p.meses, p.referencia);
  if (!tabla) return { ok: false, motivo: 'fuera-de-rango' };

  const valor = p.indicador === 'talla' ? tallaParaReferencia(p.valor, p.posicion, p.meses, tabla.referencia) : p.valor;
  const t = p.indicador === 'peso-talla' ? tallaParaReferencia(p.tallaCm!, p.posicion, p.meses, 'OMS') : p.meses;
  const lms = lmsEn(tabla.filas, t);
  if (!lms) return { ok: false, motivo: 'fuera-de-rango' };

  const z = zScore(valor, lms);
  return { ok: true, z, percentil: normalCDF(z) * 100, referencia: tabla.referencia, etiqueta: tabla.etiqueta, valorUsado: valor, aviso: avisoPara(p.indicador, z) };
}

/** IMC = peso / talla² (talla en metros). */
export function imc(pesoKg: number, tallaCm: number): number {
  return pesoKg / Math.pow(tallaCm / 100, 2);
}

/**
 * Puntos de una curva de percentilo para dibujar.
 * `xs` son edades en meses (o tallas en cm para peso/talla, con `mesesParaTabla` para elegir acostado o de pie).
 * Sin referencia fija, cada punto usa la referencia por defecto de su edad.
 */
export function curva(ind: Indicador, sexo: SexoRef, z: number, xs: number[], opciones: { referencia?: Referencia; mesesParaTabla?: number } = {}) {
  const puntos: { x: number; y: number }[] = [];
  for (const x of xs) {
    const meses = ind === 'peso-talla' ? opciones.mesesParaTabla ?? 0 : x;
    const tabla = elegirTabla(ind, sexo, meses, opciones.referencia ?? referenciaPorDefecto(ind, meses));
    const lms = tabla ? lmsEn(tabla.filas, x) : null;
    if (lms) puntos.push({ x, y: valorParaZ(z, lms) });
  }
  return puntos;
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

/** Convierte lo que se escribe ("8,25") a número, o undefined si está vacío o no es válido. */
export function leerNumero(texto: string): number | undefined {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}
