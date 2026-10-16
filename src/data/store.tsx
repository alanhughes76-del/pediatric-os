/**
 * Estado de la app en esta etapa: datos de ejemplo en memoria + sesión simulada.
 * En la etapa del backend esto se reemplaza por Vibecode Cloud (base de datos y
 * enlace mágico por email). Las pantallas solo usan `useApp()`, así que el cambio queda acotado.
 *
 * Todas las escrituras pasan por `agregar` / `actualizar`, que además suman una fila
 * al AuditLog (solo se agregan filas; nunca se editan ni se borran).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { datosDeEjemplo, DOCTOR_ID } from './mock';
import type { Database, Guardian, AuditLog } from './types';
import { ahoraISO } from '@/lib/fechas';

export type Sesion = { rol: 'medico'; usuarioId: string } | { rol: 'familia'; usuarioId: string; guardian: Guardian };

/** Tablas que guardan filas con `id` (todas menos `doctor`). */
type Tabla = Exclude<keyof Database, 'doctor' | 'auditLog'>;
type Fila<T extends Tabla> = Database[T][number];

let contador = 0;
export const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

interface AppState {
  db: Database;
  sesion: Sesion | null;
  /** Id del usuario actual (médico o adulto). */
  usuarioId: string;
  entrarComoMedico: () => void;
  entrarComoAdulto: (guardianId: string) => void;
  salir: () => void;
  /** Agrega una fila (completa `createdAt` y `createdBy`). Devuelve el id. */
  agregar: <T extends Tabla>(tabla: T, fila: Omit<Fila<T>, 'id' | 'createdAt' | 'createdBy'> & { id?: string }, accion?: string) => string;
  /** Cambia campos de una fila existente. */
  actualizar: <T extends Tabla>(tabla: T, id: string, cambios: Partial<Fila<T>>, accion?: string) => void;
  /** Varias escrituras juntas (por ejemplo, aprobar una nota y crear su seguimiento). */
  enLote: (fn: (db: Database, ctx: { ahora: string; usuarioId: string; log: (a: Omit<AuditLog, 'id' | 'at' | 'actorId'>) => void }) => Database) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(datosDeEjemplo);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const usuarioId = sesion?.usuarioId ?? DOCTOR_ID;

  const filaLog = useCallback(
    (a: Omit<AuditLog, 'id' | 'at' | 'actorId'>, actorId = usuarioId): AuditLog => ({ id: nuevoId('au'), at: ahoraISO(), actorId, ...a }),
    [usuarioId],
  );

  const agregar = useCallback<AppState['agregar']>((tabla, fila, accion) => {
    const id = fila.id ?? nuevoId(tabla.slice(0, 3));
    const completa = { ...fila, id, createdAt: ahoraISO(), createdBy: usuarioId };
    setDb((d) => ({
      ...d,
      [tabla]: [...(d[tabla] as unknown[]), completa],
      auditLog: [...d.auditLog, filaLog({ action: accion ?? `${tabla}.agregar`, entity: tabla, entityId: id })],
    }));
    return id;
  }, [usuarioId, filaLog]);

  const actualizar = useCallback<AppState['actualizar']>((tabla, id, cambios, accion) => {
    setDb((d) => ({
      ...d,
      [tabla]: (d[tabla] as { id: string }[]).map((f) => (f.id === id ? { ...f, ...cambios } : f)),
      auditLog: [...d.auditLog, filaLog({ action: accion ?? `${tabla}.editar`, entity: tabla, entityId: id, detail: Object.keys(cambios).join(', ') })],
    }));
  }, [filaLog]);

  const enLote = useCallback<AppState['enLote']>((fn) => {
    setDb((d) => {
      const nuevos: AuditLog[] = [];
      const res = fn(d, { ahora: ahoraISO(), usuarioId, log: (a) => nuevos.push(filaLog(a)) });
      return { ...res, auditLog: [...res.auditLog, ...nuevos] };
    });
  }, [usuarioId, filaLog]);

  const value = useMemo<AppState>(() => ({
    db,
    sesion,
    usuarioId,
    entrarComoMedico: () => setSesion({ rol: 'medico', usuarioId: DOCTOR_ID }),
    entrarComoAdulto: (guardianId) => {
      const guardian = db.guardians.find((g) => g.id === guardianId);
      if (!guardian?.accessEnabled) return;
      setSesion({ rol: 'familia', usuarioId: guardian.id, guardian });
      // Registro de accesos
      setDb((d) => ({ ...d, auditLog: [...d.auditLog, filaLog({ action: 'login' }, guardian.id)] }));
    },
    salir: () => setSesion(null),
    agregar,
    actualizar,
    enLote,
  }), [db, sesion, usuarioId, agregar, actualizar, enLote, filaLog]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

/** Sesión de un adulto (las pantallas de familia solo se montan con esta sesión). */
export function useSesionFamilia() {
  const { sesion } = useApp();
  if (sesion?.rol !== 'familia') throw new Error('Se esperaba una sesión de familia');
  return sesion;
}
