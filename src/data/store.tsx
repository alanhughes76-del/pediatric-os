/**
 * Estado de la app. Las pantallas solo usan `useApp()`; los datos salen de la fuente elegida
 * en src/data/fuente.ts: la demostración en memoria (por defecto) o Firebase.
 * El contrato común está en src/data/contrato.ts.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { AppState } from './contrato';
import { FUENTE } from './fuente';
import { useFuenteDemo } from './fuenteDemo';
import { useFuenteFirebase } from './firebase/fuenteFirebase';

export type { Sesion } from './contrato';
export { nuevoId } from './fuenteDemo';

const Ctx = createContext<AppState | null>(null);

// La fuente se elige al arrancar y no cambia: el hook es siempre el mismo.
const useFuente = FUENTE === 'firebase' ? useFuenteFirebase : useFuenteDemo;

export function AppProvider({ children }: { children: ReactNode }) {
  const valor = useFuente();
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
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
