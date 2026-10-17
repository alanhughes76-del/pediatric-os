/**
 * Arma una fila del registro de auditoría a partir del documento antes y después del cambio.
 * Lógica pura (sin Firebase), con tests en tests/funciones/.
 *
 * Quién: `updatedBy` del documento (las reglas obligan a que sea el uid de quien escribe;
 * el servidor firma como "sistema"). Si el documento viene de la IA (`origin: 'ia'`), se marca así.
 */
export type TipoActor = 'persona' | 'sistema' | 'ia';
export type Accion = 'crear' | 'modificar' | 'archivar' | 'borrar';

export interface EntradaAuditoria {
  at: string;
  actorId: string;
  actorType: TipoActor;
  action: Accion;
  /** Ruta del documento dentro de la organización, por ejemplo "clinical/p-tomas/notes/n1". */
  path: string;
  entity: string;
  entityId: string;
  patientId?: string;
  /** Campo → valor anterior y nuevo. En un alta, todos los campos con antes = null. */
  changes: Record<string, { antes: unknown; despues: unknown }>;
}

type Doc = Record<string, unknown> | undefined;

/** Campos de control que no cuentan como cambio. */
const IGNORADOS = new Set(['updatedAt', 'updatedBy']);

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function armarEntrada(p: {
  antes: Doc;
  despues: Doc;
  path: string;
  entity: string;
  entityId: string;
  patientId?: string;
  ahora: string;
}): EntradaAuditoria | null {
  const { antes, despues } = p;
  if (!antes && !despues) return null;

  const action: Accion = !antes ? 'crear' : !despues ? 'borrar' : !antes.archivedAt && despues.archivedAt ? 'archivar' : 'modificar';

  const changes: EntradaAuditoria['changes'] = {};
  const claves = new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})]);
  for (const k of claves) {
    if (IGNORADOS.has(k)) continue;
    const a = antes?.[k] ?? null;
    const d = despues?.[k] ?? null;
    if (!igual(a, d)) changes[k] = { antes: a, despues: d };
  }
  if (action === 'modificar' && Object.keys(changes).length === 0) return null;

  const fuente = despues ?? antes!;
  const actorId = typeof fuente.updatedBy === 'string' ? fuente.updatedBy : 'desconocido';
  const actorType: TipoActor = fuente.origin === 'ia' ? 'ia' : actorId === 'sistema' ? 'sistema' : 'persona';

  return {
    at: p.ahora,
    actorId,
    actorType,
    action,
    path: p.path,
    entity: p.entity,
    entityId: p.entityId,
    ...(p.patientId ? { patientId: p.patientId } : {}),
    changes,
  };
}
