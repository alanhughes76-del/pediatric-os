/**
 * Envío de un evento al webhook de Make: firma HMAC, reintentos con espera creciente.
 * Lógica sin Firebase (el `fetch` se inyecta), con tests en tests/funciones/.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ENCABEZADO_FIRMA = 'X-PediatricOS-Signature';
export const ENCABEZADO_TIPO = 'X-PediatricOS-Event';
export const ENCABEZADO_ID = 'X-PediatricOS-Delivery';

/** Después de este número de intentos fallidos, el evento queda "fallido" y avisa. */
export const MAX_INTENTOS = 8;

/** Firma del cuerpo: "sha256=" + HMAC-SHA256 en hexadecimal. Make la verifica con el mismo secreto. */
export function firmar(cuerpo: string, secreto: string): string {
  return 'sha256=' + createHmac('sha256', secreto).update(cuerpo, 'utf8').digest('hex');
}

/** Compara una firma recibida sin filtrar información por el tiempo de respuesta. */
export function firmaValida(cuerpo: string, secreto: string, recibida: string | undefined | null): boolean {
  if (!recibida || !secreto) return false;
  const esperada = Buffer.from(firmar(cuerpo, secreto));
  const dada = Buffer.from(recibida);
  return esperada.length === dada.length && timingSafeEqual(esperada, dada);
}

/** Espera antes del próximo intento: 1, 2, 4, 8… minutos, con un tope de 6 horas. */
export function esperaMs(intentos: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, intentos - 1), 6 * 3_600_000);
}

export interface EventoSaliente {
  id: string;
  type: string;
  occurredAt: string;
  organizationId: string;
  data: Record<string, unknown>;
}

export interface Resultado { ok: boolean; status?: number; error?: string }

export function cuerpoDe(ev: EventoSaliente): string {
  return JSON.stringify({ id: ev.id, type: ev.type, occurredAt: ev.occurredAt, organizationId: ev.organizationId, data: ev.data });
}

export async function enviarEvento(
  ev: EventoSaliente,
  opciones: { url: string; secreto: string; fetchFn?: typeof fetch; timeoutMs?: number },
): Promise<Resultado> {
  const cuerpo = cuerpoDe(ev);
  const fetchFn = opciones.fetchFn ?? fetch;
  try {
    const res = await fetchFn(opciones.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [ENCABEZADO_TIPO]: ev.type,
        [ENCABEZADO_ID]: ev.id,
        [ENCABEZADO_FIRMA]: firmar(cuerpo, opciones.secreto),
      },
      body: cuerpo,
      signal: AbortSignal.timeout(opciones.timeoutMs ?? 10_000),
    });
    return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface EstadoOutbox {
  status: 'enviado' | 'reintentar' | 'fallido';
  attempts: number;
  lastStatus: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
}

/** Qué queda guardado en el evento después de un intento. */
export function despuesDelIntento(r: Resultado, intentosPrevios: number, ahora: Date): EstadoOutbox {
  const attempts = intentosPrevios + 1;
  if (r.ok) {
    return { status: 'enviado', attempts, lastStatus: r.status ?? null, lastError: null, nextAttemptAt: null, sentAt: ahora.toISOString() };
  }
  const agotado = attempts >= MAX_INTENTOS;
  return {
    status: agotado ? 'fallido' : 'reintentar',
    attempts,
    lastStatus: r.status ?? null,
    lastError: r.error ?? 'Error desconocido',
    nextAttemptAt: agotado ? null : new Date(ahora.getTime() + esperaMs(attempts)).toISOString(),
    sentAt: null,
  };
}
