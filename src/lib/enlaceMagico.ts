/**
 * Ingreso de las familias con enlace mágico por email: vale 15 minutos y se usa una sola vez.
 * Nadie se registra solo: solo reciben enlace los adultos que el médico habilitó.
 *
 * ⚠️ PUNTO DE INTEGRACIÓN (etapa del backend): esto es una SIMULACIÓN en memoria.
 * Con Vibecode Cloud, `pedirEnlace` pasa a ser el envío real del email con el enlace
 * (lo genera y valida el servidor) y `usarEnlace` es la verificación del token al abrirlo.
 * Las reglas (15 minutos, un solo uso, solo adultos habilitados) se mantienen.
 */
import type { Guardian } from '@/data/types';
import { normalizar } from './busqueda';

export const VALIDEZ_MINUTOS = 15;

export interface Enlace {
  token: string;
  guardianId: string;
  creadoEnMs: number;
  usado: boolean;
}

export type ResultadoEnlace = { ok: true; guardianId: string } | { ok: false; motivo: 'invalido' | 'vencido' | 'usado' };

export const TEXTO_MOTIVO_ENLACE = {
  invalido: 'Este enlace no es válido. Pedí uno nuevo.',
  vencido: 'Este enlace venció (vale 15 minutos). Pedí uno nuevo.',
  usado: 'Este enlace ya se usó. Pedí uno nuevo.',
} as const;

/**
 * Crea un enlace para el email, si es de un adulto habilitado. Devuelve null si no corresponde.
 * La pantalla muestra el mismo mensaje en los dos casos, para no revelar qué emails existen.
 */
export function pedirEnlace(adultos: Guardian[], email: string, ahoraMs: number, token: string): Enlace | null {
  const e = normalizar(email);
  if (!e) return null;
  const adulto = adultos.find((g) => !g.archivedAt && g.accessEnabled && g.email && normalizar(g.email) === e);
  return adulto ? { token, guardianId: adulto.id, creadoEnMs: ahoraMs, usado: false } : null;
}

/** Verifica el enlace. Si es válido, lo marca como usado (un solo uso). */
export function usarEnlace(enlaces: Enlace[], token: string, ahoraMs: number, adultos: Guardian[]): { resultado: ResultadoEnlace; enlaces: Enlace[] } {
  const enlace = enlaces.find((x) => x.token === token);
  if (!enlace) return { resultado: { ok: false, motivo: 'invalido' }, enlaces };
  if (enlace.usado) return { resultado: { ok: false, motivo: 'usado' }, enlaces };
  if (ahoraMs - enlace.creadoEnMs > VALIDEZ_MINUTOS * 60000) return { resultado: { ok: false, motivo: 'vencido' }, enlaces };
  // Si el médico deshabilitó al adulto después de pedir el enlace, ya no entra.
  const adulto = adultos.find((g) => g.id === enlace.guardianId);
  if (!adulto?.accessEnabled) return { resultado: { ok: false, motivo: 'invalido' }, enlaces };
  return {
    resultado: { ok: true, guardianId: enlace.guardianId },
    enlaces: enlaces.map((x) => (x.token === token ? { ...x, usado: true } : x)),
  };
}
