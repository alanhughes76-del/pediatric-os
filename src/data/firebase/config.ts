/**
 * Conexión de la app con Firebase. En desarrollo habla con los emuladores (npm run emuladores).
 * La configuración web de Firebase no es secreta; los secretos viven en las Functions.
 *
 * Para probar en el iPhone con los emuladores, el teléfono y la Mac tienen que estar en la
 * misma red Wi-Fi y EXPO_PUBLIC_EMULADOR_HOST tiene que ser la IP de la Mac (no sirve el túnel).
 */
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, inMemoryPersistence, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';

export const REGION = 'southamerica-east1';
const EMULADORES = process.env.EXPO_PUBLIC_USE_EMULATORS !== 'false';
const HOST = process.env.EXPO_PUBLIC_EMULADOR_HOST || '127.0.0.1';

let conectado: { auth: Auth; db: Firestore; functions: Functions } | null = null;

export function firebase() {
  if (conectado) return conectado;
  const yaEstaba = getApps().length > 0;
  const app = yaEstaba ? getApp() : initializeApp({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-pediatric-os',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  });
  // Web: la sesión queda guardada en el navegador. Celular: por ahora en memoria (se vuelve a
  // ingresar al abrir la app); la sesión persistente llega con la versión propia de la app.
  const auth = Platform.OS === 'web' || yaEstaba ? getAuth(app) : initializeAuth(app, { persistence: inMemoryPersistence });
  const db = getFirestore(app);
  const functions = getFunctions(app, REGION);
  if (EMULADORES && !yaEstaba) {
    connectAuthEmulator(auth, `http://${HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, HOST, 8080);
    connectFunctionsEmulator(functions, HOST, 5001);
  }
  conectado = { auth, db, functions };
  return conectado;
}
