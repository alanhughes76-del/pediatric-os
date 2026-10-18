/**
 * Segundo factor (TOTP) con Firebase Authentication: ingresar con el código y darlo de alta.
 * Requiere el proyecto real con Identity Platform y TOTP activados (docs/INSTALACION.md). Los
 * emuladores de Firebase no lo permiten: la app lo dice y no deja probarlo ahí.
 */
import {
  getMultiFactorResolver, multiFactor, TotpMultiFactorGenerator,
  type Auth, type MultiFactorError, type MultiFactorResolver, type TotpSecret, type User,
} from 'firebase/auth';
import { limpiarCodigo } from '@/lib/segundoFactor';

export const EMISOR = 'Pediatric OS';

/** Si el ingreso con contraseña pide el segundo factor, devuelve con qué resolverlo. */
export function pideSegundoFactor(auth: Auth, e: unknown): MultiFactorResolver | null {
  if ((e as { code?: unknown } | null)?.code !== 'auth/multi-factor-auth-required') return null;
  return getMultiFactorResolver(auth, e as MultiFactorError);
}

/** Termina el ingreso con el código de la app de autenticación. */
export async function ingresarConCodigo(resolver: MultiFactorResolver, codigo: string): Promise<void> {
  const totp = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  if (!totp) throw Object.assign(new Error('Sin app de autenticación'), { code: 'auth/missing-multi-factor-info' });
  await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(totp.uid, limpiarCodigo(codigo)));
}

/** Primer paso del alta: la clave nueva y el enlace otpauth:// (para el QR o para abrir la app). */
export async function prepararAlta(usuario: User): Promise<{ secreto: TotpSecret; clave: string; url: string }> {
  const sesion = await multiFactor(usuario).getSession();
  const secreto = await TotpMultiFactorGenerator.generateSecret(sesion);
  return { secreto, clave: secreto.secretKey, url: secreto.generateQrCodeUrl(usuario.email ?? 'medico', EMISOR) };
}

/** Segundo paso: con el primer código que muestra la app, queda activado. */
export async function confirmarAlta(usuario: User, secreto: TotpSecret, codigo: string): Promise<void> {
  const confirmacion = TotpMultiFactorGenerator.assertionForEnrollment(secreto, limpiarCodigo(codigo));
  await multiFactor(usuario).enroll(confirmacion, 'App de autenticación');
}

/** Los segundos factores que ya tiene la cuenta. */
export function factoresDe(usuario: User | null): { nombre: string; desde: string }[] {
  if (!usuario) return [];
  return multiFactor(usuario).enrolledFactors
    .filter((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID)
    .map((f) => ({ nombre: f.displayName ?? 'App de autenticación', desde: f.enrollmentTime }));
}
