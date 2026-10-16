import type { FeverEntry, FeverSite, ChildState, Improvement, Antipyretic, AntipyreticForm } from '@/data/types';
import { fechaHoraCorta } from './fechas';

export const UMBRAL_FIEBRE = 38;

export const TEXTO_SITIO: Record<FeverSite, string> = { axilar: 'Axilar', rectal: 'Rectal', oral: 'Oral', oido: 'Oído', frente: 'Frente' };
export const TEXTO_ESTADO: Record<ChildState, string> = {
  animado: 'Animado, juega',
  decaido: 'Decaído, pero reacciona',
  'muy-decaido': 'Muy decaído, irritable o dormido',
};
export const TEXTO_MEJORIA: Record<Improvement, string> = { no: 'No mejoró', 'un-poco': 'Mejoró un poco', bien: 'Mejoró bien' };
export const TEXTO_DROGA: Record<Antipyretic, string> = { paracetamol: 'Paracetamol', ibuprofeno: 'Ibuprofeno', otro: 'Otro' };
/** Presentaciones para elegir según el medicamento. */
export const PRESENTACIONES: Partial<Record<Antipyretic, { valor: AntipyreticForm; texto: string }[]>> = {
  paracetamol: [{ valor: 'gotas', texto: 'Gotas' }, { valor: 'jarabe', texto: 'Jarabe' }],
  ibuprofeno: [{ valor: '2%', texto: 'Al 2 %' }, { valor: '4%', texto: 'Al 4 %' }],
};

const TEXTO_PRESENTACION: Record<AntipyreticForm, string> = { gotas: 'en gotas', jarabe: 'en jarabe', '2%': 'al 2 %', '4%': 'al 4 %' };

/** "Paracetamol en gotas", "Ibuprofeno al 4 %", "Dipirona" (si eligió Otro). */
export function nombreAntitermico(f: Pick<FeverEntry, 'drug' | 'drugForm' | 'drugName'>): string {
  if (f.drug === 'otro' || !f.drug) return f.drugName?.trim() || 'Otro antitérmico';
  return f.drugForm ? `${TEXTO_DROGA[f.drug]} ${TEXTO_PRESENTACION[f.drugForm]}` : TEXTO_DROGA[f.drug];
}

export const LETRA_DROGA: Record<Antipyretic, string> = { paracetamol: 'P', ibuprofeno: 'I', otro: 'O' };

export const ACLARACION_DOSIS = 'Anotá la dosis que te indicó tu pediatra. Esta app no sugiere dosis.';

export const grados = (t: number) => `${t.toFixed(1).replace('.', ',')} °C`;

/** Una línea legible por registro. */
export function lineaRegistro(f: FeverEntry): string {
  if (f.kind === 'antitermico') return `${fechaHoraCorta(f.at)} · ${nombreAntitermico(f)}${f.dose ? `, ${f.dose}` : ''}`;
  const partes = [`${fechaHoraCorta(f.at)} · ${grados(f.temperatureC ?? 0)} ${f.site ? TEXTO_SITIO[f.site].toLowerCase() : ''}`.trim()];
  if (f.state) partes.push(TEXTO_ESTADO[f.state].toLowerCase());
  if (f.improvement) partes.push(`tras antitérmico: ${TEXTO_MEJORIA[f.improvement].toLowerCase()}`);
  if (f.note) partes.push(`"${f.note}"`);
  return partes.join(', ');
}

/** Resumen para sumar al texto original de una consulta. */
export function resumenParaConsulta(registros: FeverEntry[]): string {
  const ordenados = [...registros].sort((a, b) => a.at.localeCompare(b.at));
  const tomas = ordenados.filter((r) => r.kind === 'toma' && r.temperatureC != null);
  const maxima = tomas.reduce((m, r) => Math.max(m, r.temperatureC!), 0);
  const encabezado = `Registro de fiebre (${tomas.length} ${tomas.length === 1 ? 'toma' : 'tomas'}${tomas.length ? `, máxima ${grados(maxima)}` : ''}):`;
  return [encabezado, ...ordenados.map((r) => `- ${lineaRegistro(r)}`)].join('\n');
}

/** Lee "38,5" o "38.5". Devuelve undefined si no es una temperatura posible (34 a 43 °C). */
export function leerTemperatura(texto: string): number | undefined {
  const n = Number(texto.trim().replace(',', '.'));
  return texto.trim() && Number.isFinite(n) && n >= 34 && n <= 43 ? n : undefined;
}
