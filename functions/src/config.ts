/**
 * Configuración común de las Functions.
 * Región: southamerica-east1 (San Pablo), aprobada por el Dr. sujeta a su revisión legal
 * (transferencia internacional de datos de salud). Ver docs/ETAPA_0_PROPUESTA.md, sección 13.
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const REGION = 'southamerica-east1';

setGlobalOptions({ region: REGION, maxInstances: 10 });

if (getApps().length === 0) initializeApp();

export const db = () => getFirestore();
export const auth = () => getAuth();

/** Lo que escribe el servidor queda firmado así en la auditoría. */
export const SISTEMA = 'sistema';

export const ahoraISO = () => new Date().toISOString();

/** Fecha de hoy en Argentina (AAAA-MM-DD), para comparar vigencias. */
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}
