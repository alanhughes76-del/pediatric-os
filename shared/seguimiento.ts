/**
 * Seguimientos (prompt maestro 7.5): una nota aprobada con bandera entra en la cola de Inicio.
 * Vence a las 24 h si fue urgencia y a las 48 h en el resto, contadas desde la consulta.
 * El mensaje para la familia arranca con el saludo, el resumen y las indicaciones.
 * Lógica pura: la usan la app (modo demostración) y la Function `aprobarNota`.
 */
import { isoArgentina } from './fechaHora';

export const esUrgencia = (tipoVisita: string) => tipoVisita === 'urgencia-dia' || tipoVisita === 'urgencia-noche';

export const horasDeSeguimiento = (tipoVisita: string) => (esUrgencia(tipoVisita) ? 24 : 48);

/** Vencimiento (hora de Argentina, formato de la app), a partir de la fecha y hora de la consulta. */
export function vencimientoSeguimiento(consultaISO: string, tipoVisita: string): string {
  return isoArgentina(Date.parse(consultaISO) + horasDeSeguimiento(tipoVisita) * 3_600_000);
}

export function mensajeSeguimiento(p: { nombreAdulto?: string; resumenFamilia: string; conducta: string }): string {
  const partes = [p.nombreAdulto ? `Hola, ${p.nombreAdulto}.` : 'Hola.', p.resumenFamilia.trim()];
  if (p.conducta.trim()) partes.push(`Indicaciones: ${p.conducta.trim()}`);
  return partes.filter(Boolean).join('\n\n');
}
