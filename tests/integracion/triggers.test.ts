/**
 * Los triggers del servidor corriendo de verdad en el emulador de Functions:
 * auditoría, acceso al portal y outbox. `npm run test:integracion`.
 */
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const ORG = 'org-integracion';
let app: App;
let db: Firestore;

beforeAll(() => {
  app = initializeApp({ projectId: 'demo-pediatric-os' }, 'integracion');
  db = getFirestore(app);
});
afterAll(async () => { await deleteApp(app); });

/** Espera hasta que la condición se cumpla (los triggers son asincrónicos). */
async function esperar<T>(leer: () => Promise<T | undefined | null | false>, ms = 20000): Promise<T> {
  const fin = Date.now() + ms;
  for (;;) {
    const v = await leer();
    if (v) return v;
    if (Date.now() > fin) throw new Error('El trigger no respondió a tiempo');
    await new Promise((r) => setTimeout(r, 300));
  }
}

const firma = { organizationId: ORG, createdBy: 'medico-1', updatedBy: 'medico-1', createdAt: '2026-10-17', updatedAt: '2026-10-17' };

test('un cambio clínico queda en la auditoría con antes, después y autor', async () => {
  const ref = db.doc(`organizations/${ORG}/clinical/p-x/problems/pr-x`);
  await ref.set({ ...firma, patientId: 'p-x', description: 'Asma', status: 'activo' });
  await ref.update({ status: 'resuelto', updatedAt: '2026-10-18' });

  const filas = await esperar(async () => {
    const s = await db.collection(`organizations/${ORG}/auditLog`).where('entityId', '==', 'pr-x').get();
    return s.size >= 2 ? s.docs.map((d) => d.data()) : null;
  });
  const cambio = filas.find((f) => f.action === 'modificar')!;
  expect(cambio).toMatchObject({ actorId: 'medico-1', actorType: 'persona', patientId: 'p-x', entity: 'problems' });
  expect(cambio.changes).toEqual({ status: { antes: 'activo', despues: 'resuelto' } });
  expect(filas.some((f) => f.action === 'crear')).toBe(true);
});

test('habilitar el portal de un adulto le da acceso a sus hijos y el rol de familia', async () => {
  const uid = `auth-${Date.now()}`;
  await getAuth(app).createUser({ uid, email: `${uid}@ejemplo.com` });
  await db.doc(`organizations/${ORG}/relationships/r-${uid}`).set({ ...firma, guardianId: `g-${uid}`, patientId: 'p-hijo' });
  await db.doc(`organizations/${ORG}/guardians/g-${uid}`).set({ ...firma, authUid: uid, email: `${uid}@ejemplo.com`, portalEnabled: true });

  const acceso = await esperar(async () => {
    const d = (await db.doc(`organizations/${ORG}/portalAccess/${uid}`).get()).data();
    return d?.enabled ? d : null;
  });
  expect(acceso.patientIds).toEqual(['p-hijo']);
  const claims = await esperar(async () => {
    const c = (await getAuth(app).getUser(uid)).customClaims;
    return c?.rol ? c : null;
  });
  expect(claims).toEqual({ rol: 'familia', organizationId: ORG });

  // Al deshabilitarlo, pierde el acceso.
  await db.doc(`organizations/${ORG}/guardians/g-${uid}`).update({ portalEnabled: false, updatedAt: '2026-10-18' });
  await esperar(async () => (await db.doc(`organizations/${ORG}/portalAccess/${uid}`).get()).data()?.enabled === false);
});

test('sin webhook de Make configurado, el evento queda "sin_destino" (no se simula el envío)', async () => {
  const ref = await db.collection(`organizations/${ORG}/outbox`).add({
    type: 'turno.confirmado', data: { appointmentId: 't1' }, organizationId: ORG,
    occurredAt: '2026-10-17T13:00:00.000Z', status: 'pendiente', attempts: 0,
  });
  const ev = await esperar(async () => {
    const d = (await ref.get()).data();
    return d?.status !== 'pendiente' ? d : null;
  });
  expect(ev?.status).toBe('sin_destino');
});
