/**
 * Roles de equipo (médico y asistente). Solo un médico puede asignarlos, y solo dentro de su
 * organización. El rol de familia no se asigna acá: lo da el servidor al habilitar el portal.
 *
 * El primer médico se crea con el script de datos de demostración (emulador) o, en producción,
 * con el procedimiento documentado en docs/MODELO_DE_DATOS.md.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth, ahoraISO, db } from './config';

const ROLES_EQUIPO = ['medico', 'asistente'] as const;
type RolEquipo = (typeof ROLES_EQUIPO)[number];

export const asignarRol = onCall<{ uid?: string; rol?: string }>(async (req) => {
  const token = req.auth?.token;
  if (!token || token.rol !== 'medico' || typeof token.organizationId !== 'string') {
    throw new HttpsError('permission-denied', 'Solo el médico puede asignar roles.');
  }
  const { uid, rol } = req.data ?? {};
  if (!uid || !ROLES_EQUIPO.includes(rol as RolEquipo)) {
    throw new HttpsError('invalid-argument', 'Indicá el usuario y un rol válido (médico o asistente).');
  }
  const organizationId = token.organizationId;
  const antes = (await auth().getUser(uid)).customClaims ?? {};
  if (antes.organizationId && antes.organizationId !== organizationId) {
    throw new HttpsError('permission-denied', 'Ese usuario pertenece a otra organización.');
  }

  await auth().setCustomUserClaims(uid, { rol, organizationId });
  await db().doc(`users/${uid}`).set({ rol, organizationId, updatedAt: ahoraISO(), updatedBy: req.auth!.uid }, { merge: true });
  await db().collection(`organizations/${organizationId}/auditLog`).add({
    at: ahoraISO(),
    actorId: req.auth!.uid,
    actorType: 'persona',
    action: 'modificar',
    path: `users/${uid}`,
    entity: 'users',
    entityId: uid,
    changes: { rol: { antes: antes.rol ?? null, despues: rol } },
  });
  return { ok: true };
});
