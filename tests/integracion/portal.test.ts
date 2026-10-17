/**
 * Portal de las familias (prueba 12 del prompt maestro): se entra con el enlace mágico como un
 * adulto y se comprueba que ningún dato oculto aparece, ni en las copias del portal ni leyendo la base.
 * Usa la organización `org-demo` (la del ingreso en el emulador) con ids propios de esta prueba.
 */
import { initializeApp as initAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getFirestore as getCliente, connectFirestoreEmulator, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore';

const ORG = 'org-demo';
const P = 'p-portal';
const OTRO = 'p-portal-otro';
const G = 'g-portal';
const EMAIL = `adulto.portal.${Date.now()}@ejemplo.com`;
const base = `organizations/${ORG}`;
const firma = { organizationId: ORG, patientId: P, createdBy: 'medico-x', createdAt: '2026-10-17', updatedBy: 'medico-x', updatedAt: '2026-10-17' };

let admin: App;
let fs: Firestore;
let anonimo: FirebaseApp;
let familia: FirebaseApp;

const llamar = <T,>(app: FirebaseApp, nombre: string, datos: unknown) => httpsCallable<unknown, T>(getFunctions(app, 'southamerica-east1'), nombre)(datos);
const portal = (sub: string) => `${base}/portal/${P}/${sub}`;

/** Espera a que los triggers armen las copias. */
async function esperar(cond: () => Promise<boolean>, ms = 15000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (await cond()) return; await new Promise((r) => setTimeout(r, 250)); }
  throw new Error('No se armaron las copias del portal a tiempo');
}

function cliente(nombre: string) {
  const app = initializeApp({ projectId: 'demo-pediatric-os', apiKey: 'demo' }, nombre);
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app, 'southamerica-east1'), '127.0.0.1', 5001);
  connectFirestoreEmulator(getCliente(app), '127.0.0.1', 8080);
  return app;
}

beforeAll(async () => {
  admin = initAdmin({ projectId: 'demo-pediatric-os' }, 'portal-admin');
  fs = getFirestore(admin);
  await fs.doc(`${base}/families/f-portal`).set({ organizationId: ORG, name: 'Familia Portal' });
  await fs.doc(`${base}/patients/${P}`).set({ organizationId: ORG, familyId: 'f-portal', firstName: 'Ana', lastName: 'Portal', birthDate: '2024-01-01', sex: 'F', dni: '50.000.001', bloodType: 'A+' });
  await fs.doc(`${base}/patients/${OTRO}`).set({ organizationId: ORG, firstName: 'Otro', lastName: 'Chico', birthDate: '2023-01-01', sex: 'M' });
  await fs.doc(`${base}/guardians/${G}`).set({ organizationId: ORG, familyId: 'f-portal', firstName: 'Laura', lastName: 'Portal', email: EMAIL, portalEnabled: true, createdBy: 'medico-x', createdAt: '2026-10-17', updatedBy: 'medico-x', updatedAt: '2026-10-17' });
  await fs.doc(`${base}/professionals/medico-portal`).set({ organizationId: ORG, name: 'Dr. Prueba' });
  await fs.doc(`${base}/guardians/${G}/addresses/ad-portal`).set({ organizationId: ORG, guardianId: G, street: 'Calle Falsa 123', locality: 'Olivos' });
  await fs.doc(`${base}/relationships/r-portal`).set({ organizationId: ORG, patientId: P, guardianId: G, type: 'madre', isPrimary: true });
  const c = `${base}/clinical/${P}`;
  await fs.doc(`${c}/consultations/c1`).set({ ...firma, occurredAt: '2026-10-10T10:00:00-03:00', visitType: 'control', modality: 'domicilio', rawText: 'TEXTO INTERNO' });
  await fs.doc(`${c}/notes/n-ok`).set({ ...firma, consultationId: 'c1', version: 1, status: 'aprobada', findings: 'HALLAZGO SECRETO', plan: 'CONDUCTA SECRETA', familySummary: 'Está muy bien.', allergiesMedication: '', clinicalFlag: false, approvedAt: 'a' });
  await fs.doc(`${c}/notes/n-borrador`).set({ ...firma, consultationId: 'c1', version: 2, status: 'borrador', findings: 'x', plan: 'x', familySummary: 'BORRADOR', allergiesMedication: '', clinicalFlag: false });
  await fs.doc(`${c}/allergies/a-ref`).set({ ...firma, allergen: 'ALERGIA REFERIDA', severity: 'leve', status: 'referida' });
  await fs.doc(`${c}/allergies/a-conf`).set({ ...firma, allergen: 'Maní', severity: 'grave', status: 'confirmada' });
  await fs.doc(`${c}/problems/pr-oculto`).set({ ...firma, description: 'PROBLEMA OCULTO', status: 'activo', visibleToFamily: false });
  await fs.doc(`${c}/problems/pr-visible`).set({ ...firma, description: 'Asma', status: 'activo', visibleToFamily: true });
  await fs.doc(`${c}/documents/d-oculto`).set({ ...firma, title: 'DOC OCULTO', date: '2026-10-01', file: 'orgs/x/oculto.pdf', visibleToFamily: false });
  await fs.doc(`${c}/documents/d-visible`).set({ ...firma, title: 'Informe', date: '2026-10-02', file: 'orgs/x/visible.pdf', visibleToFamily: true });
  await fs.doc(`${c}/medications/m1`).set({ ...firma, drug: 'MEDICACION', dose: 'x', startDate: '2026-10-01' });
  anonimo = cliente('portal-anonimo');
  familia = cliente('portal-familia');
  await esperar(async () => (await fs.doc(`${portal('summaries')}/n-ok`).get()).exists && (await fs.doc(`${portal('allergies')}/a-conf`).get()).exists && (await fs.doc(`${portal('datos')}/paciente`).get()).exists);
});
afterAll(async () => { await deleteApp(anonimo); await deleteApp(familia); await deleteAdmin(admin); });

describe('enlace mágico', () => {
  let enlace = '';

  test('un email que no está habilitado recibe la misma respuesta, sin enlace', async () => {
    const r = await llamar<{ ok: boolean; mensaje: string; enlaceDePrueba?: string }>(anonimo, 'pedirEnlace', { email: 'nadie@ejemplo.com' });
    expect(r.data.ok).toBe(true);
    expect(r.data.enlaceDePrueba).toBeUndefined();
  });

  test('un adulto habilitado recibe el enlace (en el emulador se devuelve para probar) y entra', async () => {
    const r = await llamar<{ ok: boolean; mensaje: string; enlaceDePrueba?: string }>(anonimo, 'pedirEnlace', { email: EMAIL.toUpperCase() });
    expect(r.data.enlaceDePrueba).toMatch(/\/ingresar\?token=/);
    enlace = r.data.enlaceDePrueba!;
    const token = new URL(enlace).searchParams.get('token');
    const e = await llamar<{ token: string }>(anonimo, 'entrarConEnlace', { token });
    const cred = await signInWithCustomToken(getAuth(familia), e.data.token);
    const claims = (await cred.user.getIdTokenResult()).claims;
    expect(claims).toMatchObject({ rol: 'familia', organizationId: ORG });
    // La base guarda la huella, no el código; el ingreso queda registrado.
    const links = (await fs.collection(`${base}/magicLinks`).where('guardianId', '==', G).get()).docs;
    expect(links.some((d) => d.id === token)).toBe(false);
    const logins = (await fs.collection(`${base}/auditLog`).where('actorId', '==', G).where('action', '==', 'login').get()).size;
    expect(logins).toBeGreaterThan(0);
  });

  test('el mismo enlace no sirve dos veces', async () => {
    const token = new URL(enlace).searchParams.get('token');
    await expect(llamar(anonimo, 'entrarConEnlace', { token })).rejects.toMatchObject({ code: 'functions/failed-precondition' });
  });
});

describe('lo que ve la familia (prueba 12)', () => {
  const db = () => getCliente(familia);
  const todo = async (sub: string) => JSON.stringify((await getDocs(collection(db(), portal(sub)))).docs.map((d) => d.data()));

  test('las copias no llevan organizationId (no se mezclan con lo clínico que el médico lee por grupo)', async () => {
    const copias = await fs.collectionGroup('allergies').where('organizationId', '==', ORG).get();
    expect(copias.docs.every((d) => d.ref.path.includes('/clinical/'))).toBe(true);
    expect((await fs.doc(`${portal('allergies')}/a-conf`).get()).data()?.organizationId).toBeUndefined();
  });

  test('las copias no tienen nada oculto', async () => {
    const resumenes = await todo('summaries');
    expect(resumenes).toContain('Está muy bien.');
    for (const secreto of ['HALLAZGO SECRETO', 'CONDUCTA SECRETA', 'BORRADOR', 'TEXTO INTERNO']) expect(resumenes).not.toContain(secreto);
    const alergias = await todo('allergies');
    expect(alergias).toContain('Maní');
    expect(alergias).not.toContain('ALERGIA REFERIDA');
    const problemas = await todo('problems');
    expect(problemas).toContain('Asma');
    expect(problemas).not.toContain('PROBLEMA OCULTO');
    // Los documentos no van al portal, ni siquiera los marcados "Lo ve la familia".
    expect(await todo('documents')).toBe('[]');
    const paciente = (await getDoc(doc(db(), `${portal('datos')}/paciente`))).data()!;
    expect(paciente).toMatchObject({ firstName: 'Ana', birthDate: '2024-01-01' });
    expect(paciente.dni).toBeUndefined();
    expect(paciente.bloodType).toBeUndefined();
  });

  test('leyendo la base directo, los originales están cerrados', async () => {
    for (const ruta of [`${base}/clinical/${P}/notes/n-ok`, `${base}/clinical/${P}/allergies/a-ref`, `${base}/clinical/${P}/problems/pr-oculto`, `${base}/clinical/${P}/medications/m1`, `${base}/patients/${P}`]) {
      await expect(getDoc(doc(db(), ruta))).rejects.toMatchObject({ code: 'permission-denied' });
    }
    await expect(getDocs(collection(db(), `${base}/portal/${OTRO}/summaries`))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(getDocs(collection(db(), portal('medications')))).resolves.toHaveProperty('size', 0);
  });

  test('la fiebre que carga la familia aparece en su copia, sin revisar', async () => {
    const uid = getAuth(familia).currentUser!.uid;
    await setDoc(doc(db(), `${base}/clinical/${P}/fever/fv-familia`), {
      organizationId: ORG, patientId: P, kind: 'toma', at: '2026-10-17T10:00:00-03:00', temperatureC: 38.4, site: 'axilar', state: 'animado', origin: 'familia',
      createdBy: uid, createdAt: '2026-10-17T10:00:00-03:00', updatedBy: uid, updatedAt: '2026-10-17T10:00:00-03:00',
    });
    await esperar(async () => (await fs.doc(`${portal('fever')}/fv-familia`).get()).exists);
    const copia = (await getDoc(doc(db(), `${portal('fever')}/fv-familia`))).data()!;
    expect(copia).toMatchObject({ temperatureC: 38.4, reviewed: false, origin: 'familia' });
  });
});

describe('acciones de la familia', () => {
  const db = () => getCliente(familia);

  test('pedir un control: queda como solicitud en la agenda, para el día y la hora que prefieren', async () => {
    const manana = new Date(Date.now() + 2 * 86_400_000 - 3 * 3_600_000).toISOString().slice(0, 10);
    const r = await llamar<{ id: string }>(familia, 'pedirVisita', { patientIds: [P], tipo: 'control', fecha: manana, hora: '10:00', addressId: 'ad-portal', motivo: 'Control anual' });
    const t = (await fs.doc(`${base}/appointments/${r.data.id}`).get()).data()!;
    expect(t).toMatchObject({ status: 'solicitado', origin: 'portal', type: 'control', patientIds: [P], familyId: 'f-portal', start: `${manana}T10:00:00-03:00`, reason: 'Control anual' });
    expect(t.address).toMatchObject({ text: 'Calle Falsa 123', locality: 'Olivos', addressId: 'ad-portal' });
    // La familia lo ve en su portal (sin notas internas).
    await esperar(async () => (await fs.doc(`${portal('turnos')}/${r.data.id}`).get()).exists);
  });

  test('solo para sus hijos, y con un tope de pedidos sin confirmar', async () => {
    await expect(llamar(familia, 'pedirVisita', { patientIds: [OTRO], tipo: 'urgencia' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    await llamar(familia, 'pedirVisita', { patientIds: [P], tipo: 'urgencia', motivo: 'Fiebre' });
    await llamar(familia, 'pedirVisita', { patientIds: [P], tipo: 'urgencia' });
    await expect(llamar(familia, 'pedirVisita', { patientIds: [P], tipo: 'urgencia' })).rejects.toMatchObject({ code: 'functions/resource-exhausted' });
  });

  test('Mis datos: cambia su teléfono y al Dr. le llega un aviso; no puede habilitarse el portal', async () => {
    const uid = getAuth(familia).currentUser!.uid;
    const ahora = '2026-10-17T11:00:00-03:00';
    await updateDoc(doc(db(), `${base}/guardians/${G}`), { phone: '+5491155559999', updatedBy: uid, updatedAt: ahora });
    await expect(updateDoc(doc(db(), `${base}/guardians/${G}`), { portalEnabled: false, updatedBy: uid, updatedAt: ahora })).rejects.toMatchObject({ code: 'permission-denied' });
    await esperar(async () => !(await fs.collection(`${base}/notifications`).where('guardianId', '==', G).get()).empty);
    const aviso = (await fs.collection(`${base}/notifications`).where('guardianId', '==', G).get()).docs[0].data();
    expect(aviso).toMatchObject({ recipientUid: 'medico-portal', kind: 'datos_familia', campos: ['phone'], readAt: null });
    const ev = (await fs.collection(`${base}/outbox`).where('type', '==', 'familia.datos_actualizados').get()).docs.map((d) => d.data()).find((e) => e.data.guardianId === G)!;
    expect(ev.data).toEqual({ guardianId: G, familyId: 'f-portal', campos: ['phone'] });
  });
});
