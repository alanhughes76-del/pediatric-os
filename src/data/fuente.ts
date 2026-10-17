/**
 * De dónde salen los datos de la app:
 * - 'demo' (por defecto): datos ficticios en memoria, con el selector de rol de prueba.
 * - 'firebase': ingreso real y datos en Firestore (en desarrollo, los emuladores).
 * Se elige con EXPO_PUBLIC_DATOS en .env.local (ver .env.example).
 */
export type Fuente = 'demo' | 'firebase';
export const FUENTE: Fuente = process.env.EXPO_PUBLIC_DATOS === 'firebase' ? 'firebase' : 'demo';
