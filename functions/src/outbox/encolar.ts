/**
 * Encolar un evento para Make. Toda función del servidor que quiera avisar algo afuera llama acá;
 * el envío lo hace `despacharEvento` (outbox/triggers.ts).
 * - Suma la audiencia, la plantilla y, si no es solo de sistema, los destinatarios y los chicos.
 * - Si el Dr. apagó ese evento en Configuración, queda registrado como "apagado" y no sale.
 * - Con `clave`, el evento sale una sola vez (por ejemplo, un recordatorio por turno).
 */
import { ahoraISO, db } from '../config';
import { isoArgentina } from '../../../shared/fechaHora';
import { CATALOGO } from './catalogo';
import { contactosDelEvento } from './destinatarios';
import type { TipoEvento } from './eventos';

/** Id de la outbox para un evento único: sin barras ni caracteres raros. */
export const idUnico = (tipo: TipoEvento, clave: string) => `${tipo}__${clave}`.replace(/[^\w.-]+/g, '_').slice(0, 300);

export async function eventosApagados(orgId: string): Promise<string[]> {
  const a = (await db().doc(`organizations/${orgId}/settings/automatizaciones`).get()).data()?.apagados;
  return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [];
}

export async function encolarEvento(orgId: string, type: TipoEvento, data: Record<string, unknown>, opciones: { clave?: string } = {}) {
  const def = CATALOGO[type];
  const ahora = ahoraISO();
  const coleccion = db().collection(`organizations/${orgId}/outbox`);
  if (opciones.clave && (await coleccion.doc(idUnico(type, opciones.clave)).get()).exists) return null;

  const contactos = def.audiencia === 'sistema' ? {} : await contactosDelEvento(orgId, data);
  const apagado = (await eventosApagados(orgId)).includes(type);
  const evento = {
    type,
    audiencia: def.audiencia,
    plantilla: def.plantilla ?? null,
    // Lo que trae el evento manda (por ejemplo, el resumen ya trae sus destinatarios con email).
    data: { ...contactos, ...data },
    organizationId: orgId,
    // Hora de Argentina, como el resto de la app. `nextAttemptAt` queda en UTC: lo compara el reintento.
    occurredAt: isoArgentina(),
    status: apagado ? 'apagado' : 'pendiente',
    attempts: 0,
    nextAttemptAt: ahora,
    createdAt: isoArgentina(),
  };
  if (!opciones.clave) return (await coleccion.add(evento)).id;
  const ref = coleccion.doc(idUnico(type, opciones.clave));
  try {
    await ref.create(evento);
    return ref.id;
  } catch (e) {
    // Otro proceso lo creó recién: ya está.
    if ((e as { code?: number }).code === 6) return null;
    throw e;
  }
}
