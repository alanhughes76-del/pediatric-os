/**
 * Parámetros de las Functions (no secretos). En el emulador salen de functions/.env.demo-pediatric-os;
 * en el proyecto real, de su propio archivo .env.<proyecto>.
 */
import { defineString } from 'firebase-functions/params';

/** Organización a la que entran las reservas y los ingresos de las familias (hay una sola: la del Dr.). */
export const ORGANIZACION_ID = defineString('ORGANIZACION_ID', { default: '' });

/** Dirección de la app web, para armar el enlace mágico. */
export const URL_APP = defineString('URL_APP', { default: '' });
