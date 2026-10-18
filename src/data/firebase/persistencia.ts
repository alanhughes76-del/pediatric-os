/**
 * Dónde guarda Firebase la sesión. En la web, el navegador (lo resuelve getAuth). En el
 * teléfono, `persistencia.native.ts`.
 */
import type { Persistence } from 'firebase/auth';

export function persistenciaDelTelefono(): Persistence | null {
  return null;
}
