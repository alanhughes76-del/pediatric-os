/**
 * Hitos del desarrollo: listas CDC/AAP 2022 por edad y área (hitos_desarrollo.json),
 * recordatorios de tamizaje (AAP/SAP) y pautas PRUNAPE de 5 años.
 */
import datos from '@/data/referencias/hitos_desarrollo.json';

export const CONTROLES = [2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60] as const;

export const FUENTE_HITOS: string = datos.fuente;
export const AREAS = datos.areas as [string, string][];

export const AVISO_HITOS =
  'Si no cumple uno o más hitos, perdió habilidades que tenía o la familia está preocupada, no esperar: tamizaje estandarizado (PRUNAPE, IODI, ASQ-3) o derivación.';
export const ACLARACION_HITOS = 'Estas listas orientan; no son un test de tamizaje.';

export interface ItemHito { id: string; texto: string; etiqueta?: string }
export interface GrupoHitos { titulo: string; items: ItemHito[] }

export interface ControlElegido {
  control: number;
  /** Aviso cuando la edad queda fuera de las listas (antes de 2 meses o después de 66). */
  aviso?: string;
}

/** Lista del control más cercano que no supere la edad (en meses, corregida si corresponde). */
export function controlParaEdad(meses: number): ControlElegido {
  if (meses < 2) return { control: 2, aviso: 'Todavía no cumplió 2 meses: se muestra la lista de los 2 meses.' };
  if (meses > 66) return { control: 60, aviso: 'Tiene más de 5 años y medio: se muestra la última lista disponible (5 años).' };
  let elegido: number = CONTROLES[0];
  for (const c of CONTROLES) if (c <= meses) elegido = c;
  return { control: elegido };
}

export function etiquetaControl(control: number): string {
  return (datos.etiquetas as Record<string, string>)[String(control)] ?? `${control} meses`;
}

/** Grupos para mostrar en un control: las cuatro áreas y, a los 60 meses, las pautas PRUNAPE. */
export function gruposDelControl(control: number): GrupoHitos[] {
  const porArea = (datos.hitos as Record<string, Record<string, string[]>>)[String(control)] ?? {};
  const grupos: GrupoHitos[] = AREAS.map(([clave, nombre]) => ({
    titulo: nombre,
    items: (porArea[clave] ?? []).map((texto, i) => ({ id: `${control}:${clave}:${i}`, texto })),
  })).filter((g) => g.items.length > 0);

  if (control === 60) {
    for (const [grupo, items] of datos.prunape_5_anios as [string, [string, string][]][]) {
      grupos.push({
        titulo: `PRUNAPE 5 años · ${grupo}`,
        items: items.map(([texto, letra], i) => ({ id: `prunape:${grupo}:${i}`, texto, etiqueta: `Pauta ${letra}` })),
      });
    }
  }
  return grupos;
}

/** Recordatorios de tamizaje que corresponden a ese control (AAP y/o SAP). */
export function recordatoriosTamizaje(control: number): string[] {
  const quienes = (datos.tamizaje_en as Record<string, string[]>)[String(control)] ?? [];
  const textos = datos.tamizaje_texto as Record<string, string>;
  return quienes.map((q) => textos[q]).filter(Boolean);
}
