/**
 * Nota clínica y certificados por el servidor (pruebas 6, 8 y 11 del prompt maestro):
 * aprobar con bandera crea el seguimiento con el vencimiento correcto; corregir crea una versión
 * nueva; un certificado se emite, se anula con motivo y no se anula dos veces.
 */
import { initializeApp as initAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const ORG = 'org-clinica';
const P = 'p-clin';
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
const llamar = <T = Record<string, unknown>>(app: FirebaseApp, nombre: string, datos: unknown) =>
  httpsCallable<unknown, T>(getFunctions(app, 'southamerica-east1'), nombre)(datos);

const raiz = `organizations/${ORG}/clinical/${P}`;
const firma = { organizationId: ORG, patientId: P, createdBy: 'x', createdAt: '2026-10-17', updatedBy: 'x', updatedAt: '2026-10-17' };

beforeAll(async () => {
  admin = initAdmin({ projectId: 'demo-pediatric-os' }, 'clinica-admin');
  fs = getFirestore(admin);
  await fs.doc(`organizations/${ORG}/patients/${P}`).set({ organizationId: ORG, firstName: 'Ana', lastName: 'Prueba', birthDate: '2024-01-01', sex: 'F' });
  await fs.doc(`organizations/${ORG}/guardians/g-clin`).set({ organizationId: ORG, firstName: 'Laura', lastName: 'Prueba' });
  await fs.doc(`organizations/${ORG}/relationships/r-clin`).set({ organizationId: ORG, patientId: P, guardianId: 'g-clin', isPrimary: true });
  await fs.doc(`${raiz}/consultations/c-urg`).set({ ...firma, occurredAt: '2026-10-17T10:00:00-03:00', visitType: 'urgencia-dia', status: 'programada' });
  await fs.doc(`${raiz}/notes/n-urg`).set({ ...firma, consultationId: 'c-urg', version: 1, status: 'borrador', findings: '', plan: '', familySummary: '', allergiesMedication: '', clinicalFlag: false });
  medico = await cliente('medico-clin', 'medico');
  asistente = await cliente('asistente-clin', 'asistente');
});
afterAll(async () => { await deleteApp(medico); await deleteApp(asistente); await deleteAdmin(admin); });

const campos = { findings: 'Otitis', plan: 'Control en 24 h.', familySummary: 'Tiene una otitis.', allergiesMedication: '', clinicalFlag: true, origin: 'humano' };

test('el asistente no puede aprobar notas', async () => {
  await expect(llamar(asistente, 'aprobarNota', { patientId: P, noteId: 'n-urg', campos })).rejects.toMatchObject({ code: 'functions/permission-denied' });
});

test('aprobar con bandera: nota aprobada, consulta realizada y seguimiento a las 24 h', async () => {
  const r = await llamar<{ seguimientoNuevo: string }>(medico, 'aprobarNota', { patientId: P, noteId: 'n-urg', campos });
  const nota = (await fs.doc(`${raiz}/notes/n-urg`).get()).data()!;
  expect(nota).toMatchObject({ status: 'aprobada', findings: 'Otitis', clinicalFlag: true });
  expect(nota.approvedAt).toMatch(/-03:00$/);
  expect((await fs.doc(`${raiz}/consultations/c-urg`).get()).data()!.status).toBe('realizada');
  const seg = (await fs.doc(`${raiz}/followUps/${r.data.seguimientoNuevo}`).get()).data()!;
  expect(seg).toMatchObject({ status: 'pendiente', dueAt: '2026-10-18T10:00:00-03:00', consultationId: 'c-urg' });
  expect(seg.message).toBe('Hola, Laura.\n\nTiene una otitis.\n\nIndicaciones: Control en 24 h.');
});

test('una nota aprobada no se aprueba de nuevo', async () => {
  await expect(llamar(medico, 'aprobarNota', { patientId: P, noteId: 'n-urg', campos })).rejects.toMatchObject({ code: 'functions/failed-precondition' });
});

test('resumen para la familia: solo el médico, solo con nota aprobada y con algún email', async () => {
  const mail = { patientId: P, noteId: 'n-urg', asunto: 'Resumen de la consulta de Ana', texto: 'Hola, Laura.\n\nTiene una otitis.' };
  await expect(llamar(asistente, 'enviarResumenFamilia', mail)).rejects.toMatchObject({ code: 'functions/permission-denied' });
  await expect(llamar(medico, 'enviarResumenFamilia', mail)).rejects.toMatchObject({ code: 'functions/failed-precondition', message: expect.stringContaining('email') });
  await fs.doc(`organizations/${ORG}/guardians/g-clin`).update({ email: 'laura@ejemplo.com' });
  const r = await llamar<{ destinatarios: number }>(medico, 'enviarResumenFamilia', mail);
  expect(r.data.destinatarios).toBe(1);
  // El evento es el único con texto clínico; la comunicación registrada no lo guarda.
  const ev = (await fs.collection(`organizations/${ORG}/outbox`).where('type', '==', 'resumen.envio_aprobado').get()).docs[0].data();
  expect(ev.data).toMatchObject({ patientId: P, noteId: 'n-urg', texto: mail.texto, destinatarios: [{ guardianId: 'g-clin', email: 'laura@ejemplo.com' }] });
  const com = (await fs.doc(`organizations/${ORG}/communications/${ev.data.communicationId}`).get()).data()!;
  expect(com).toMatchObject({ kind: 'resumen_familia', status: 'enviado_a_make', recipientIds: ['g-clin'] });
  expect(com.texto).toBeUndefined();
});

test('corregir: la aprobada queda reemplazada y nace la versión 2 en borrador', async () => {
  const r = await llamar<{ id: string }>(medico, 'corregirNota', { patientId: P, noteId: 'n-urg' });
  expect((await fs.doc(`${raiz}/notes/n-urg`).get()).data()!.status).toBe('reemplazada');
  expect((await fs.doc(`${raiz}/notes/${r.data.id}`).get()).data()).toMatchObject({ status: 'borrador', version: 2, previousVersionId: 'n-urg', findings: 'Otitis' });
});

test('el resumen de una nota que no está aprobada no se manda', async () => {
  await expect(llamar(medico, 'enviarResumenFamilia', { patientId: P, noteId: 'n-urg', asunto: 'x', texto: 'y' }))
    .rejects.toMatchObject({ code: 'functions/failed-precondition' });
});

test('certificado: se emite con su documento, se anula con motivo y no dos veces', async () => {
  const datos = { patientId: P, type: 'aptitud-fisica', body: 'Certifico que…', requestedBy: 'Laura Prueba', destination: 'el colegio', date: '2026-10-17' };
  const r = await llamar<{ id: string }>(medico, 'emitirCertificado', datos);
  const cert = (await fs.doc(`${raiz}/certificates/${r.data.id}`).get()).data()!;
  expect(cert).toMatchObject({ status: 'emitido', type: 'aptitud-fisica', place: 'Buenos Aires' });
  const documento = (await fs.doc(`${raiz}/documents/${cert.documentId}`).get()).data()!;
  expect(documento).toMatchObject({ kind: 'certificado', origin: 'sistema', visibleToFamily: true, mimeType: 'application/pdf' });
  // El PDF quedó guardado en Storage (sin enlace público).
  const [existe] = await getStorage(admin).bucket('demo-pediatric-os.appspot.com').file(documento.file).exists();
  expect(existe).toBe(true);
  const [contenido] = await getStorage(admin).bucket('demo-pediatric-os.appspot.com').file(documento.file).download();
  expect(contenido.subarray(0, 5).toString()).toBe('%PDF-');

  await expect(llamar(medico, 'anularCertificado', { patientId: P, certificateId: r.data.id, reason: '' })).rejects.toMatchObject({ code: 'functions/invalid-argument' });
  await llamar(medico, 'anularCertificado', { patientId: P, certificateId: r.data.id, reason: 'Fecha equivocada' });
  expect((await fs.doc(`${raiz}/certificates/${r.data.id}`).get()).data()).toMatchObject({ status: 'anulado', voidReason: 'Fecha equivocada' });
  await expect(llamar(medico, 'anularCertificado', { patientId: P, certificateId: r.data.id, reason: 'Otra vez' })).rejects.toMatchObject({ code: 'functions/failed-precondition' });

  // Se emite otro: el anulado queda como estaba.
  const otro = await llamar<{ id: string }>(medico, 'emitirCertificado', { ...datos, date: '2026-10-18' });
  expect(otro.data.id).not.toBe(r.data.id);
  expect((await fs.doc(`${raiz}/certificates/${otro.data.id}`).get()).data()).toMatchObject({ status: 'emitido', date: '2026-10-18' });
  expect((await fs.doc(`${raiz}/certificates/${r.data.id}`).get()).data()!.status).toBe('anulado');
});

test('enviar material: solo el médico, registra el envío y emite el aviso sin datos clínicos', async () => {
  await fs.doc(`organizations/${ORG}/educationalMaterials/mat-1`).set({ organizationId: ORG, title: 'Sueño seguro', kind: 'enlace', url: 'https://ejemplo.com', topics: ['sueño'] });
  await expect(llamar(asistente, 'enviarMaterial', { materialId: 'mat-1', patientId: P })).rejects.toMatchObject({ code: 'functions/permission-denied' });
  await expect(llamar(medico, 'enviarMaterial', { materialId: 'no-existe', patientId: P })).rejects.toMatchObject({ code: 'functions/not-found' });
  const r = await llamar<{ id: string }>(medico, 'enviarMaterial', { materialId: 'mat-1', patientId: P });
  expect((await fs.doc(`organizations/${ORG}/materialDeliveries/${r.data.id}`).get()).data()).toMatchObject({ patientId: P, materialId: 'mat-1' });
  const ev = (await fs.collection(`organizations/${ORG}/outbox`).where('type', '==', 'material.enviado').get()).docs[0].data();
  expect(Object.keys(ev.data).sort()).toEqual(['deliveryId', 'destinatarios', 'familyId', 'materialId', 'pacientes', 'patientId', 'titulo']);
});
