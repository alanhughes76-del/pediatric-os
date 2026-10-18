/**
 * En el teléfono la sesión queda guardada en el almacenamiento de la app (AsyncStorage): no hay
 * que volver a ingresar cada vez que se abre. "Cerrar sesión" la borra.
 * `getReactNativePersistence` existe solo en la versión de Firebase para React Native (Metro la
 * elige sola); los tipos que ve TypeScript son los de la web, por eso se toma así.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as auth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';

export function persistenciaDelTelefono(): Persistence | null {
  const { getReactNativePersistence } = auth as unknown as { getReactNativePersistence?: (s: typeof AsyncStorage) => Persistence };
  return getReactNativePersistence ? getReactNativePersistence(AsyncStorage) : null;
}
