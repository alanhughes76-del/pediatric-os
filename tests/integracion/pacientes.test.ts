/**
 * Alta de pacientes por el servidor, con el control de duplicados (regla 8 y prueba 2 del prompt):
 * se llama a la Function como lo hará la app, con un usuario médico del emulador.
 */
import { initializeApp as initAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CALENDARIO } from '../../shared/vacunas';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const ORG = 'org-alta';
let admin: App;
let app: FirebaseApp;

const alta = (datos: Record<string, unknown>) => httpsCallable<Record<string, unknown>, { estado: string; id?: string; posibles?: unknown[] }>(
  getFunctions(app, 'southamerica-east1'), 'crearPaciente')(datos);

beforeAll(async () => {
  admin = initAdmin({ projectId: 'demo-pediatric-os' }, 'alta-admin');
  const uid = `medico-alta-${Date.now()}`;
  await getAdminAuth(admin).createUser({ uid, email: `${uid}@ejemplo.com`, password: 'clave-de-prueba' });
  await getAdminAuth(admin).setCustomUserClaims(uid, { rol: 'medico', organizationId: ORG });

  app = initializeApp({ projectId: 'demo-pediatric-os', apiKey: 'demo' }, 'alta-cliente');
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app, 'southamerica-east1'), '127.0.0.1', 5001);
  await signInWithEmailAndPassword(getAuth(app), `${uid}@ejemplo.com`, 'clave-de-prueba');
});
afterAll(async () => { await deleteApp(app); await deleteAdmin(admin); });

const hermana = { firstName: 'Ana', lastName: 'Prueba Mellizas', birthDate: '2024-03-10', sex: 'F', dni: `60.${Date.now() % 1000}.001` };

test('crea un paciente nuevo, con su esquema de vacunas según el calendario', async () => {
  const r = await alta(hermana);
  expect(r.data.estado).toBe('creado');
  // Prueba 10 del prompt maestro: el esquema se arma aunque el calendario no esté verificado.
  const dosis = (await getFirestore(admin).collection(`organizations/${ORG}/clinical/${r.data.id}/vaccineDoses`).get()).docs.map((d) => d.data());
  expect(dosis).toHaveLength(CALENDARIO.filter((d) => d.tipo === 'obligatoria').length);
  expect(dosis.every((d) => d.status === 'pendiente' && d.source === 'calendario' && d.patientId === r.data.id)).toBe(true);
  expect(dosis.find((d) => d.vaccine === 'BCG')?.dueDate).toBe('2024-03-10');
});

test('con el mismo DNI (escrito distinto) el servidor rechaza el alta', async () => {
  await expect(alta({ ...hermana, firstName: 'Otra', dni: hermana.dni.replace(/\./g, '') })).rejects.toMatchObject({ code: 'functions/already-exists' });
});

test('mismo apellido y fecha: pide confirmación (pueden ser mellizas) y guarda si se confirma', async () => {
  const melliza = { firstName: 'Bea', lastName: 'prueba mellizas', birthDate: '2024-03-10', sex: 'F' };
  const primero = await alta(melliza);
  expect(primero.data.estado).toBe('posible-duplicado');
  expect(primero.data.posibles).toHaveLength(1);
  const segundo = await alta({ ...melliza, confirmarPosibleDuplicado: true });
  expect(segundo.data.estado).toBe('creado');
});

test('valida los datos obligatorios en el servidor', async () => {
  await expect(alta({ firstName: 'Sin', lastName: 'Fecha', sex: 'M' })).rejects.toMatchObject({ code: 'functions/invalid-argument' });
  await expect(alta({ ...hermana, dni: '', gestationalWeeks: 50, lastName: 'Otra' })).rejects.toMatchObject({ code: 'functions/invalid-argument' });
});
