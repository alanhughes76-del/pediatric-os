/** Quién llama a una Function: exige sesión, rol y organización. */
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export function exigirRol(req: CallableRequest<unknown>, roles: string[]) {
  const t = req.auth?.token;
  if (!t || !roles.includes(t.rol) || typeof t.organizationId !== 'string') {
    throw new HttpsError('permission-denied', 'No tenés permiso para hacer esto.');
  }
  return { uid: req.auth!.uid, org: t.organizationId as string };
}

export const exigirMedico = (req: CallableRequest<unknown>) => exigirRol(req, ['medico']);

/** Texto obligatorio y con largo razonable. */
export function texto(v: unknown, nombre: string, max = 20_000): string {
  if (typeof v !== 'string' || !v.trim()) throw new HttpsError('invalid-argument', `Falta ${nombre}.`);
  if (v.length > max) throw new HttpsError('invalid-argument', `${nombre} es demasiado largo.`);
  return v.trim();
}

export function id(v: unknown, nombre: string): string {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(v)) throw new HttpsError('invalid-argument', `${nombre} no es válido.`);
  return v;
}
