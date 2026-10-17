/**
 * Enlace mágico de las familias (prompt maestro 4 y propuesta, sección 6). Lógica pura, con tests.
 * - El código es aleatorio (32 bytes) y la base guarda solo su huella (SHA-256): quien lea la base
 *   no puede armar un enlace válido.
 * - Vale 15 minutos y se usa una sola vez. Como mucho 3 pedidos cada 15 minutos por adulto.
 * - El mail no lleva información clínica: solo el enlace.
 */
import { createHash, randomBytes } from 'node:crypto';

export const VALIDEZ_MS = 15 * 60_000;
export const PEDIDOS_POR_VENTANA = 3;

export const nuevoCodigo = () => randomBytes(32).toString('base64url');
export const huella = (codigo: string) => createHash('sha256').update(codigo, 'utf8').digest('hex');

export const codigoConFormaValida = (c: unknown): c is string => typeof c === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(c);

export const normalizarEmail = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '');
export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

export type EstadoEnlace = 'valido' | 'invalido' | 'vencido' | 'usado';

export function estadoDelEnlace(e: { expiresAtMs?: number; usedAt?: unknown } | undefined, ahoraMs: number): EstadoEnlace {
  if (!e || typeof e.expiresAtMs !== 'number') return 'invalido';
  if (e.usedAt) return 'usado';
  if (ahoraMs > e.expiresAtMs) return 'vencido';
  return 'valido';
}

export const MENSAJE_ENLACE: Record<Exclude<EstadoEnlace, 'valido'>, string> = {
  invalido: 'Este enlace no es válido. Pedí uno nuevo.',
  vencido: 'Este enlace venció (vale 15 minutos). Pedí uno nuevo.',
  usado: 'Este enlace ya se usó. Pedí uno nuevo.',
};

export const enlaceDeIngreso = (urlApp: string, codigo: string) => `${urlApp.replace(/\/+$/, '')}/ingresar?token=${codigo}`;

/** Mail del enlace: sin información clínica. */
export function mailDelEnlace(nombre: string, enlace: string) {
  const saludo = nombre.trim() ? `Hola, ${nombre.trim()}.` : 'Hola.';
  return {
    asunto: 'Tu enlace para entrar · Dr. Alan Hughes',
    texto: [
      saludo,
      'Tocá este enlace para entrar al portal de las familias. Vale 15 minutos y se usa una sola vez:',
      enlace,
      'Si no lo pediste, ignorá este mail.',
      'Dr. Alan Hughes · Pediatría a domicilio',
    ].join('\n\n'),
  };
}
