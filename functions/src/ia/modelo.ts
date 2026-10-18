/**
 * Llamada a la API de Claude (solo desde el servidor: la clave nunca va a la app).
 * - Modelo Claude Opus 5.5, con salida en JSON según el esquema de cada acción.
 * - Si el modelo declina (stop_reason "refusal"), la API reintenta sola con el modelo de respaldo
 *   recomendado (`fallbacks: "default"`); si igual declina, se informa como rechazo.
 * - Los errores vuelven en palabras para el Dr., sin códigos técnicos.
 */
import Anthropic from '@anthropic-ai/sdk';

export const MODELO_IA = 'claude-opus-5-5';

export interface PedidoModelo { sistema: string; usuario: string; esquema: Record<string, unknown> }
export interface RespuestaModelo {
  estado: 'ok' | 'rechazo' | 'incompleta' | 'error';
  json?: unknown;
  modelo?: string;
  tokensEntrada?: number;
  tokensSalida?: number;
  error?: string;
}
/** Se inyecta para poder probar sin llamar a la API. */
export type Modelo = (p: PedidoModelo) => Promise<RespuestaModelo>;

export function modeloClaude(apiKey: string): Modelo {
  const client = new Anthropic({ apiKey });
  return async (p) => {
    try {
      const r = await client.beta.messages.create({
        model: MODELO_IA,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'high', format: { type: 'json_schema', schema: p.esquema } },
        system: p.sistema,
        messages: [{ role: 'user', content: p.usuario }],
      });
      const base = { modelo: r.model, tokensEntrada: r.usage.input_tokens, tokensSalida: r.usage.output_tokens };
      if (r.stop_reason === 'refusal') return { ...base, estado: 'rechazo' };
      if (r.stop_reason === 'max_tokens') return { ...base, estado: 'incompleta' };
      const texto = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      try {
        return { ...base, estado: 'ok', json: JSON.parse(texto) };
      } catch {
        return { ...base, estado: 'incompleta' };
      }
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) return { estado: 'error', error: 'La clave de la IA no es válida. Revisala en el servidor.' };
      if (e instanceof Anthropic.RateLimitError) return { estado: 'error', error: 'La IA está ocupada. Probá de nuevo en un minuto.' };
      if (e instanceof Anthropic.APIConnectionError) return { estado: 'error', error: 'No hubo conexión con la IA. Probá de nuevo.' };
      if (e instanceof Anthropic.APIError) return { estado: 'error', error: `La IA no pudo responder (error ${e.status ?? 'desconocido'}). Probá de nuevo.` };
      return { estado: 'error', error: 'La IA no pudo responder. Probá de nuevo.' };
    }
  };
}
