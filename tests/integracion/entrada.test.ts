/**
 * Endpoint de entrada desde Make (Etapa 8b) en el emulador: firma, idempotencia y qué hace cada tipo.
 * Usa la organización `org-demo` (la de ORGANIZACION_ID en el emulador) con ids propios de esta prueba.
 */
import { createHmac } from 'node:crypto';
import { initializeApp as initAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const ORG = 'org-demo';
const base = `organizations/${ORG}`;
const URL = 'http://127.0.0.1:5001/demo-pediatric-os/southamerica-east1/entradaMake';
// El mismo secreto de functions/.secret.local (solo para el emulador).
const SECRETO = 'solo-para-el-emulador';
const SUFIJO = Date.now().toString(36);
const firma = { organizationId: ORG, createdBy: 'medico-x', createdAt: '2026-10-01', updatedBy: 'medico-x', updatedAt: '2026-10-01' };

let admin: App;
let fs: Firestore;

async function enviar(tipo: string, id: string, datos: Record<string, unknown>, secreto = SECRETO) {
  const cuerpo = JSON.stringify({ tipo, id: `${id}-${SUFIJO}`, datos });
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PediatricOS-Signature': `sha256=${createHmac('sha256', secreto).update(cuerpo).digest('hex')}` },
    body: cuerpo,
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

beforeAll(async () => {
  admin = initAdmin({ projectId: 'demo-pediatric-os' }, 'entrada-admin');
  fs = getFirestore(admin);
  await fs.doc(`${base}/families/f-entrada`).set({ ...firma, name: `Familia Zubizarreta${SUFIJO}` });
  await fs.doc(`${base}/guardians/g-entrada`).set({ ...firma, familyId: 'f-entrada', firstName: 'Inés', lastName: 'Z', email: `ines.${SUFIJO}@ejemplo.com`, phone: '+5491155557777' });
  await fs.doc(`${base}/patients/p-entrada`).set({ ...firma, familyId: 'f-entrada', firstName: 'Pía', lastName: 'Z', birthDate: '2024-02-29', sex: 'F' });
  await fs.doc(`${base}/professionals/medico-entrada`).set({ ...firma, name: 'Dr. Prueba', signature: 'x' });
});
afterAll(async () => { await deleteAdmin(admin); });

test('sin la firma correcta no entra nada', async () => {
  const r = await enviar('telegram.pago', 'firma-mala', { texto: 'pago 100 Ruiz' }, 'otro-secreto');
  expect(r.status).toBe(401);
});

test('un tipo desconocido se rechaza', async () => {
  expect((await enviar('otra.cosa', 'x', {})).status).toBe(400);
});

test('pago por Telegram: queda "a confirmar", con la familia reconocida; el mismo envío no se duplica', async () => {
  const r = await enviar('telegram.pago', 'pago-1', { texto: `pago 150.000 transferencia Zubizarreta${SUFIJO}` });
  expect(r.status).toBe(200);
  expect(r.json).toMatchObject({ resultado: 'a_confirmar', monto: 150000, moneda: 'ARS' });
  const pago = (await fs.doc(`${base}/payments/${r.json.paymentId}`).get()).data()!;
  expect(pago).toMatchObject({ familyId: 'f-entrada', amount: 150000, status: 'a_confirmar', method: 'transferencia' });
  const otra = await enviar('telegram.pago', 'pago-1', { texto: `pago 150.000 transferencia Zubizarreta${SUFIJO}` });
  expect(otra.json).toMatchObject({ repetido: true });
  const pagos = await fs.collection(`${base}/payments`).where('familyId', '==', 'f-entrada').get();
  expect(pagos.size).toBe(1);
});

test('pago sin monto: se rechaza con un mensaje para responder por Telegram', async () => {
  const r = await enviar('telegram.pago', 'pago-sin-monto', { texto: 'pago Zubizarreta' });
  expect(r.status).toBe(422);
  expect(String(r.json.error)).toContain('monto');
});

test('Plaud: borrador pendiente con el paciente sugerido por la fecha de nacimiento y las medidas dictadas', async () => {
  const r = await enviar('plaud.transcripcion', 'plaud-1', { texto: 'Control de Pía, nació el 29/02/2024. Peso 11,4 kg, talla 84 cm.', fecha: '2026-10-16T10:00:00-03:00' });
  expect(r.status).toBe(200);
  const t = (await fs.doc(`${base}/transcripciones/${r.json.transcripcionId}`).get()).data()!;
  expect(t).toMatchObject({ estado: 'pendiente', pacientesSugeridos: ['p-entrada'], fechasNacimiento: ['2024-02-29'], medidas: { weightKg: 11.4, heightCm: 84 } });
  // Nada clínico se crea solo: ni consulta ni medición.
  expect((await fs.collection(`${base}/clinical/p-entrada/consultations`).get()).size).toBe(0);
  const aviso = (await fs.collection(`${base}/notifications`).where('recipientUid', '==', 'medico-entrada').where('kind', '==', 'plaud').get()).docs;
  expect(aviso.length).toBeGreaterThan(0);
});

test('formulario web: un contacto nuevo es un interesado (el mensaje, aparte); una familia ya cargada no', async () => {
  const nuevo = await enviar('formulario.web', 'web-1', { nombre: 'Laura Nueva', email: `laura.${SUFIJO}@ejemplo.com`, telefono: '11 5555-8888', mensaje: 'Quería consultar por la membresía.' });
  expect(nuevo.json).toMatchObject({ resultado: 'interesado_nuevo' });
  const i = (await fs.doc(`${base}/interesados/${nuevo.json.interesadoId}`).get()).data()!;
  expect(i).toMatchObject({ nombre: 'Laura Nueva', telefono: '+5491155558888', estado: 'nuevo' });
  expect(i.mensaje).toBeUndefined();
  const adm = await fs.collection(`${base}/admisiones`).where('interesadoId', '==', nuevo.json.interesadoId).get();
  expect(adm.docs[0].data().mensaje).toBe('Quería consultar por la membresía.');

  const existente = await enviar('formulario.web', 'web-2', { nombre: 'Inés', email: `ines.${SUFIJO}@ejemplo.com` });
  expect(existente.json).toMatchObject({ resultado: 'familia_existente', familyId: 'f-entrada' });
});

test('triage de urgencia: se adjunta a la solicitud de urgencia de esa familia', async () => {
  const ahora = new Date(Date.now() + 2 * 3_600_000).toISOString();
  await fs.doc(`${base}/appointments/t-urg-entrada`).set({ ...firma, status: 'solicitado', type: 'urgencia-dia', start: ahora, familyId: 'f-entrada', patientIds: ['p-entrada'], durationMin: 40 });
  const r = await enviar('tally.triage_urgencia', 'triage-1', { email: `ines.${SUFIJO}@ejemplo.com`, respuestas: [{ pregunta: '¿Cuánta fiebre?', respuesta: '39' }] });
  expect(r.json).toMatchObject({ resultado: 'adjuntado_a_la_solicitud', appointmentId: 't-urg-entrada' });
  const t = (await fs.doc(`${base}/triage/${r.json.triageId}`).get()).data()!;
  expect(t).toMatchObject({ appointmentId: 't-urg-entrada', familyId: 'f-entrada', revisadoAt: null });
});

test('estado de entrega de un evento: queda en Comunicaciones', async () => {
  const ev = await fs.collection(`${base}/outbox`).add({ type: 'turno.recordatorio_24h', audiencia: 'familia', data: { familyId: 'f-entrada', appointmentId: 'x' }, status: 'enviado', organizationId: ORG, createdAt: '2026-10-17' });
  const r = await enviar('mensajeria.estado', 'estado-1', { eventId: ev.id, estado: 'delivered', canal: 'email' });
  expect(r.json).toMatchObject({ resultado: 'registrado' });
  const c = (await fs.doc(`${base}/communications/ev-${ev.id}`).get()).data()!;
  expect(c).toMatchObject({ kind: 'recordatorio', channel: 'email', direction: 'saliente', status: 'entregado', familyId: 'f-entrada' });
});

test('mensaje entrante: se registra sin el texto y se vincula a la familia', async () => {
  const r = await enviar('mensajeria.entrante', 'msg-1', { telefono: '+5491155557777', texto: 'TEXTO DEL MENSAJE', canal: 'whatsapp' });
  expect(r.json).toMatchObject({ resultado: 'vinculado' });
  const c = (await fs.collection(`${base}/communications`).where('familyId', '==', 'f-entrada').where('kind', '==', 'mensaje').get()).docs[0].data();
  expect(c).toMatchObject({ direction: 'entrante', channel: 'otro' });
  expect(JSON.stringify(c)).not.toContain('TEXTO DEL MENSAJE');
});
