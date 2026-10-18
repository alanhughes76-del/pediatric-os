/**
 * Segundo factor del médico (TOTP: el código de 6 números de una app de autenticación, como
 * Google Authenticator o 1Password). Lógica pura, con tests: el código, la clave y los mensajes.
 */
import QRCode from 'qrcode';

/** Saca espacios y guiones: "123 456" → "123456". */
export const limpiarCodigo = (texto: string) => texto.replace(/[\s-]/g, '');

export const codigoValido = (texto: string) => /^\d{6}$/.test(limpiarCodigo(texto));

/** La clave para escribir a mano, en grupos de 4: "ABCD EFGH …". */
export const claveEnGrupos = (clave: string) => clave.replace(/(.{4})(?=.)/g, '$1 ');

/** Módulos del código QR (true = cuadrado oscuro), para dibujarlo con react-native-svg. */
export function modulosQR(texto: string): boolean[][] {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: 'M' });
  return Array.from({ length: modules.size }, (_, f) => Array.from({ length: modules.size }, (_, c) => modules.get(f, c) === 1));
}

/** Mensajes en palabras para los errores de Firebase del segundo factor. */
export function mensajeSegundoFactor(code: string): string | null {
  if (code === 'auth/invalid-verification-code' || code === 'auth/totp-challenge-timeout') {
    return 'El código no es correcto o ya cambió. Escribí el que muestra ahora la app de autenticación.';
  }
  if (code === 'auth/requires-recent-login') return 'Por seguridad, cerrá sesión, volvé a entrar y probá de nuevo.';
  if (code === 'auth/unverified-email') return 'Tu email todavía no está verificado. Se verifica al crear el usuario del médico (docs/INSTALACION.md).';
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
    return 'El segundo factor no está activado en el proyecto de Firebase (docs/INSTALACION.md).';
  }
  if (code === 'auth/missing-multi-factor-info' || code === 'auth/multi-factor-info-not-found') {
    return 'Esta cuenta no tiene una app de autenticación configurada.';
  }
  return null;
}
