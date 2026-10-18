/**
 * IA Asistente en el emulador (Etapa 9). Sin clave de la API no se llama a ningún modelo: estas pruebas
 * comprueban que apagada no hace nada, que encendida sin clave lo dice (no simula una respuesta) y que
 * solo el médico la usa. La lógica con un modelo falso está en tests/funciones/ia.test.ts.
 */
import { initializeApp as initAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const ORG = 'org-ia';
let admin: App;
let fs: Firestore;
let medico: FirebaseApp;
let asistente: FirebaseApp;

async function cliente(nombre: string, rol: string): Promise<FirebaseApp> {
  const uid = `${nombre}-${Date.now()}`;
  await getAdminAuth(admin).createUser({ uid, email: `${uid}@ejemplo.com`, password: 'clave-de-prueba' });
  await getAdminAuth(admin).setCustomUserClaims(uid, { rol, organizationId: ORG });
  const app = initializeApp({ projectId: 'demo-pediatric-os', apiKey: 'demo' }, uid);
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app, 'southamerica-east1'), '127.0.0.1', 5001);
  await signInWithEmailAndPassword(getAuth(app), `${uid}@ejemplo.com`, 'clave-de-prueba');
  return app;
}
const llamar = (app: FirebaseApp, datos: unknown) => httpsCallable(getFunctions(app, 'southamerica-east1'), 'iaAsistente')(datos);
const mensajeDe = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return (e as Error).message.replace(/\s*\[\d{3}\]$/, ''); } };

beforeAll(async () => {
  admin = initAdmin({ projectId: 'demo-pediatric-os' }, 'ia-admin');
  fs = getFirestore(admin);
  await fs.doc(`organizations/${ORG}/patients/p-ia`).set({ organizationId: ORG, firstName: 'Ana', lastName: 'IA', birthDate: '2024-01-01', sex: 'F' });
  medico = await cliente('medico-ia', 'medico');
  asistente = await cliente('asistente-ia', 'asistente');
});
afterAll(async () => { await deleteApp(medico); await deleteApp(asistente); await deleteAdmin(admin); });

test('apagada: no hace nada y lo dice', async () => {
  expect(await mensajeDe(llamar(medico, { accion: 'resumir_historia', patientId: 'p-ia' }))).toContain('La IA está apagada');
  expect((await fs.collection(`organizations/${ORG}/aiInteractions`).get()).size).toBe(0);
});

test('encendida sin clave en el servidor: lo dice, no simula una respuesta', async () => {
  await fs.doc(`organizations/${ORG}/settings/ia`).set({ organizationId: ORG, enabled: true });
  expect(await mensajeDe(llamar(medico, { accion: 'resumir_historia', patientId: 'p-ia' }))).toContain('Falta configurar la clave de la IA');
  expect((await fs.collection(`organizations/${ORG}/aiInteractions`).get()).size).toBe(0);
});

test('solo el médico; acciones desconocidas se rechazan', async () => {
  expect(await mensajeDe(llamar(asistente, { accion: 'resumir_historia', patientId: 'p-ia' }))).toBeTruthy();
  expect(await mensajeDe(llamar(medico, { accion: 'recetar', patientId: 'p-ia' }))).toContain('La acción no es válida');
});
