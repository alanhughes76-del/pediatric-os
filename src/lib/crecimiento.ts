/**
 * Crecimiento por visita: para cada medición, la edad usada en el cálculo y el percentilo
 * de cada indicador. Lógica pura (la usan la tabla por visita y los puntos del gráfico).
 */
import type { GrowthMeasurement, Patient } from '@/data/types';
import { edadParaCalculo } from './edad';
import { calcular, imc, posicionPorEdad, tallaParaReferencia, type Indicador, type Posicion, type Referencia, type ResultadoPercentil, type SexoRef } from './percentiles';

export interface Medida { valor: number; resultado: ResultadoPercentil }

export interface FilaCrecimiento {
  medicion: GrowthMeasurement;
  fecha: string;
  /** Edad en meses usada para el cálculo (corregida si corresponde). */
  meses?: number;
  corregida: boolean;
  /** No se puede calcular la edad (fecha anterior al nacimiento o antes de término). */
  sinEdad?: 'antes-de-nacer' | 'antes-del-termino';
  posicion?: Posicion;
  peso?: Medida;
  talla?: Medida;
  pc?: Medida;
  imc?: Medida;
  pesoTalla?: Medida;
}

/** Sexo de referencia: M o F; si el paciente es X, el elegido (o undefined si falta elegir). */
export function sexoDeReferencia(p: Pick<Patient, 'sex' | 'growthReferenceSex'>): SexoRef | undefined {
  return p.sex === 'X' ? p.growthReferenceSex : p.sex;
}

/**
 * Calcula todas las medidas de una medición.
 * `referencia` fija OMS o SAP para peso y talla (si no, se usa la de la edad).
 */
export function filaDeCrecimiento(p: Pick<Patient, 'birthDate' | 'gestationalWeeks' | 'gestationalDays'>, sexo: SexoRef | undefined, m: GrowthMeasurement, referencia?: Referencia): FilaCrecimiento {
  const edad = edadParaCalculo(p, m.measuredAt);
  const fila: FilaCrecimiento = { medicion: m, fecha: m.measuredAt, corregida: edad.ok && edad.corregida };
  if (!edad.ok) return { ...fila, sinEdad: edad.motivo };
  fila.meses = edad.meses;
  if (!sexo) return fila;

  const posicion = m.position ?? posicionPorEdad(edad.meses);
  fila.posicion = posicion;
  const medir = (indicador: Indicador, valor: number, extra: { tallaCm?: number } = {}): Medida => ({
    valor,
    resultado: calcular({ indicador, sexo, valor, meses: edad.meses, posicion, referencia: indicador === 'peso' || indicador === 'talla' ? referencia : undefined, ...extra }),
  });

  if (m.weightKg != null) fila.peso = medir('peso', m.weightKg);
  if (m.heightCm != null) fila.talla = medir('talla', m.heightCm);
  if (m.headCm != null) fila.pc = medir('pc', m.headCm);
  if (m.weightKg != null && m.heightCm != null) {
    // IMC (siempre OMS) con la talla llevada a la posición de la tabla OMS.
    fila.imc = medir('imc', imc(m.weightKg, tallaParaReferencia(m.heightCm, posicion, edad.meses, 'OMS')));
    fila.pesoTalla = medir('peso-talla', m.weightKg, { tallaCm: m.heightCm });
  }
  return fila;
}

export function filasDeCrecimiento(p: Patient, mediciones: GrowthMeasurement[], referencia?: Referencia): FilaCrecimiento[] {
  const sexo = sexoDeReferencia(p);
  return [...mediciones].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)).map((m) => filaDeCrecimiento(p, sexo, m, referencia));
}
