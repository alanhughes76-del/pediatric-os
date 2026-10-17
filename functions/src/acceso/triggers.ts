/**
 * Mantiene `portalAccess/{authUid}`: a qué chicos puede ver cada adulto. Es lo que consultan
 * las reglas del portal. Se recalcula cuando cambia el adulto (habilitación, email) o un vínculo.
 * Si el adulto pierde el acceso, se cierran sus sesiones abiertas.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { auth, ahoraISO, db, hoyArgentina } from '../config';
import { calcularAcceso, type AdultoParaAcceso, type VinculoParaAcceso } from './calcular';

export async function recalcularAcceso(orgId: string, guardianId: string) {
  const org = db().doc(`organizations/${orgId}`);
  const adulto = await org.collection('guardians').doc(guardianId).get();
  const datos = adulto.data();
  const authUid = typeof datos?.authUid === 'string' ? datos.authUid : null;
  if (!authUid) return; // todavía no tiene cuenta: se crea al primer ingreso por enlace

  const vinculos = await org.collection('relationships').where('guardianId', '==', guardianId).get();
  const acceso = calcularAcceso((datos ?? {}) as AdultoParaAcceso, vinculos.docs.map((d) => d.data() as VinculoParaAcceso), hoyArgentina());

  const anterior = (await org.collection('portalAccess').doc(authUid).get()).data();
  await org.collection('portalAccess').doc(authUid).set({ ...acceso, guardianId, updatedAt: ahoraISO() });

  try {
    if (acceso.enabled) {
      await auth().setCustomUserClaims(authUid, { rol: 'familia', organizationId: orgId });
    } else if (anterior?.enabled) {
      await auth().revokeRefreshTokens(authUid);
    }
  } catch (e) {
    // El usuario de Auth puede no existir todavía (se crea al primer ingreso).
    logger.info('Acceso recalculado sin usuario de Auth', { guardianId, motivo: e instanceof Error ? e.message : String(e) });
  }
}

export const accesoPorAdulto = onDocumentWritten('organizations/{orgId}/guardians/{guardianId}', async (event) => {
  await recalcularAcceso(event.params.orgId, event.params.guardianId);
});

export const accesoPorVinculo = onDocumentWritten('organizations/{orgId}/relationships/{relId}', async (event) => {
  const ids = new Set(
    [event.data?.before.data()?.guardianId, event.data?.after.data()?.guardianId].filter((x): x is string => typeof x === 'string'),
  );
  for (const guardianId of ids) await recalcularAcceso(event.params.orgId, guardianId);
});
