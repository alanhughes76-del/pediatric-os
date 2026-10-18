import { useApp } from '@/data/store';
import type { RolEquipo } from './permisos';

/** Rol del equipo en la sesión actual (en las pantallas de /medico solo entran médico y asistente). */
export function useRolEquipo(): RolEquipo {
  const { sesion } = useApp();
  return sesion?.rol === 'asistente' ? 'asistente' : 'medico';
}
