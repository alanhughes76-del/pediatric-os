/**
 * Agenda en el servidor (pruebas 3, 4 y 5 del prompt maestro, y los tests de la sección 7 de la propuesta):
 * dos turnos confirmados superpuestos se rechazan; dos confirmaciones a la vez: gana una sola;
 * cancelar libera el horario; reprogramar deja rastro; una reserva de Cal.com entra como "solicitado".
 * Usa la organización `org-demo`, que es a la que entra el endpoint de Cal.com en el emulador.
 */
import { createHmac } from 'node:crypto';
import { initializeApp as initAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const ORG = 'org-demo';
const FAMILIA = 'f-turnos';
const P1 = 'p-turnos-1';
const P2 = 'p-turnos-2';
// Lunes 2 de noviembre de 2026, dentro del horario de atención.
const DIA = '2026-11-02';
const a = (hhmm: string, dia = DIA) => `${dia}T${hhmm}:00-03:00`;
const URL_CAL = 'http://127.0.0.1:5001/demo-pediatric-os/southamerica-east1/reservaCalcom';
const SECRETO_CAL = 'solo-para-el-emulador';

let admin: App;
let fs: Firestore;
let medico: FirebaseApp;

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
type Res = { estado: 'guardado' | 'avisos'; id?: string; avisos: { tipo: string; mensaje: string }[] };
const llamar = async (nombre: string, datos: unknown) =>
  (await httpsCallable<unknown, Res>(getFunctions(medico, 'southamerica-east1'), nombre)(datos)).data;
const crear = (hhmm: string, extra: Record<string, unknown> = {}) =>
  llamar('crearTurno', { start: a(hhmm), type: 'control', patientIds: [P1], address: { text: 'Libertador 2210', locality: 'Olivos' }, ...extra });
const turno = async (id: string) => (await fs.doc(`organizations/${ORG}/appointments/${id}`).get()).data()!;
const historial = async (id: string) =>
  (await fs.collection(`organizations/${ORG}/appointments/${id}/history`).orderBy('atMs').get()).docs.map((d) => d.data());
/** Mensaje del error sin el código HTTP que agrega el SDK (" [400]"), igual que en la app. */
const mensajeDe = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return (e as Error).message.replace(/\s*\[\d{3}\]$/, ''); } };

beforeAll(async () => {
  admin = initAdmin({ projectId: 'demo-pediatric-os' }, 'turnos-admin');
  fs = getFirestore(admin);
  const base = { organizationId: ORG, familyId: FAMILIA, birthDate: '2024-01-01', sex: 'F' };
  await fs.doc(`organizations/${ORG}/families/${FAMILIA}`).set({ organizationId: ORG, name: 'Familia Turnos' });
  await fs.doc(`organizations/${ORG}/patients/${P1}`).set({ ...base, firstName: 'Ana', lastName: 'Turnos', dniDigits: '55123456' });
  await fs.doc(`organizations/${ORG}/patients/${P2}`).set({ ...base, firstName: 'Beto', lastName: 'Turnos' });
  medico = await cliente('medico-turnos', 'medico');
});
afterAll(async () => { await deleteApp(medico); await deleteAdmin(admin); });

describe('superposición de turnos confirmados', () => {
  let primero = '';
  let segundo = '';

  test('crear y confirmar un turno: ocupa su lugar en el día', async () => {
    const r = await crear('10:00', { confirmar: true });
    expect(r.estado).toBe('guardado');
    primero = r.id!;
    expect(await turno(primero)).toMatchObject({ status: 'confirmado', day: DIA, zone: 'GBA Zona Norte', durationMin: 45, origin: 'medico' });
    const dia = (await fs.doc(`organizations/${ORG}/agendaDays/${DIA}`).get()).data()!;
    expect(dia.bloques[primero]).toMatchObject({ hora: '10:00' });
  });

  test('otro confirmado que se pisa: el servidor lo rechaza', async () => {
    expect(await mensajeDe(crear('10:30', { confirmar: true, aceptarAvisos: true }))).toBe('Se superpone con el turno de las 10:00.');
    expect(await mensajeDe(crear('11:00', { confirmar: true, aceptarAvisos: true }))).toBe('Quedan menos de 30 min de traslado con el turno de las 10:00.');
  });

  test('como pendiente entra, pero primero avisa; y no se puede confirmar encima', async () => {
    const aviso = await crear('10:30', { patientIds: [P1, P2] });
    expect(aviso.estado).toBe('avisos');
    expect(aviso.avisos.map((x) => x.tipo)).toEqual(['superposicion']);
    const r = await crear('10:30', { patientIds: [P1, P2], aceptarAvisos: true });
    expect(r.estado).toBe('guardado');
    segundo = r.id!;
    expect(await turno(segundo)).toMatchObject({ status: 'pendiente', patientIds: [P1, P2], familyId: FAMILIA });
    expect(await mensajeDe(llamar('accionTurno', { id: segundo, accion: 'confirmar', aceptarAvisos: true }))).toBe('Se superpone con el turno de las 10:00.');
  });

  test('cancelar libera el horario (y pide motivo)', async () => {
    expect(await mensajeDe(llamar('accionTurno', { id: primero, accion: 'cancelar' }))).toBe('Para cancelar, escribí el motivo.');
    await llamar('accionTurno', { id: primero, accion: 'cancelar', motivo: 'La familia viaja' });
    expect(await turno(primero)).toMatchObject({ status: 'cancelado', cancelReason: 'La familia viaja' });
    const dia = (await fs.doc(`organizations/${ORG}/agendaDays/${DIA}`).get()).data()!;
    expect(dia.bloques[primero]).toBeUndefined();
    const r = await llamar('accionTurno', { id: segundo, accion: 'confirmar', aceptarAvisos: true });
    expect(r.estado).toBe('guardado');
    expect((await turno(segundo)).status).toBe('confirmado');
    // Un turno cancelado no se vuelve a confirmar.
    expect(await mensajeDe(llamar('accionTurno', { id: primero, accion: 'confirmar' }))).toBe('No se puede hacer eso con un turno cancelado.');
  });

  test('reprogramar deja rastro en el historial y mueve el bloque', async () => {
    await llamar('accionTurno', { id: segundo, accion: 'reprogramar', start: a('16:00', '2026-11-03'), aceptarAvisos: true });
    expect(await turno(segundo)).toMatchObject({ status: 'confirmado', start: a('16:00', '2026-11-03'), day: '2026-11-03' });
    const h = await historial(segundo);
    expect(h.map((x) => x.action)).toEqual(['crear', 'confirmar', 'reprogramar']);
    expect(h[2].before).toMatchObject({ start: a('10:30'), status: 'confirmado' });
    expect(h[2].after).toMatchObject({ start: a('16:00', '2026-11-03'), status: 'confirmado' });
    expect((await fs.doc(`organizations/${ORG}/agendaDays/${DIA}`).get()).data()!.bloques[segundo]).toBeUndefined();
    expect((await fs.doc(`organizations/${ORG}/agendaDays/2026-11-03`).get()).data()!.bloques[segundo]).toBeDefined();
    const cancelado = await historial(primero);
    expect(cancelado.at(-1)).toMatchObject({ action: 'cancelar', reason: 'La familia viaja' });
  });

  test('avisos a Make: confirmado, cancelado y reprogramado, sin datos clínicos ni dirección', async () => {
    const eventos = (await fs.collection(`organizations/${ORG}/outbox`).get()).docs.map((d) => d.data()).filter((e) => e.data.appointmentId === segundo);
    expect(eventos.map((e) => e.type).sort()).toEqual(['turno.confirmado', 'turno.reprogramado']);
    expect(Object.keys(eventos[0].data).sort()).toEqual(['appointmentId', 'durationMin', 'familyId', 'modality', 'start']);
  });
});

describe('dos confirmaciones a la vez', () => {
  test('solo una gana', async () => {
    const intentos = await Promise.allSettled([
      llamar('crearTurno', { start: a('15:00', '2026-11-04'), type: 'control', patientIds: [P1], confirmar: true, aceptarAvisos: true }),
      llamar('crearTurno', { start: a('15:00', '2026-11-04'), type: 'control', patientIds: [P2], confirmar: true, aceptarAvisos: true }),
      llamar('crearTurno', { start: a('15:15', '2026-11-04'), type: 'control', patientIds: [P1], confirmar: true, aceptarAvisos: true }),
    ]);
    expect(intentos.filter((i) => i.status === 'fulfilled')).toHaveLength(1);
    const dia = (await fs.doc(`organizations/${ORG}/agendaDays/2026-11-04`).get()).data()!;
    expect(Object.keys(dia.bloques)).toHaveLength(1);
  });
});

describe('reservas de Cal.com', () => {
  const reserva = (uid: string, dni: string, trigger = 'BOOKING_CREATED') => JSON.stringify({
    triggerEvent: trigger,
    payload: {
      uid, type: 'control-de-salud', title: 'Control de salud',
      startTime: '2026-11-05T13:00:00.000Z', endTime: '2026-11-05T13:45:00.000Z',
      attendees: [{ name: 'Laura Prueba', email: 'laura@ejemplo.com' }],
      responses: { dni: { value: dni }, telefono: { value: '11 5555-1234' }, direccion: { value: 'Calle Falsa 123' }, localidad: { value: 'Olivos' } },
    },
  });
  const enviar = (cuerpo: string, secreto = SECRETO_CAL) => fetch(URL_CAL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': createHmac('sha256', secreto).update(cuerpo).digest('hex') },
    body: cuerpo,
  });

  test('con DNI conocido: entra como "solicitado" y vinculada al paciente', async () => {
    const r = await enviar(reserva('reserva1', '55.123.456'));
    expect(r.status).toBe(200);
    const t = await turno('cal-reserva1');
    expect(t).toMatchObject({ status: 'solicitado', origin: 'calcom', patientIds: [P1], familyId: FAMILIA, start: '2026-11-05T10:00:00-03:00', zone: 'GBA Zona Norte' });
    expect(t.porIdentificar).toBeUndefined();
    // Repetida: no duplica.
    expect((await enviar(reserva('reserva1', '55.123.456'))).status).toBe(200);
    expect((await historial('cal-reserva1')).map((h) => h.action)).toEqual(['solicitud']);
  });

  test('con DNI desconocido: "familia por identificar", con el contacto', async () => {
    expect((await enviar(reserva('reserva2', '40111222'))).status).toBe(200);
    expect(await turno('cal-reserva2')).toMatchObject({
      status: 'solicitado', patientIds: [], familyId: null,
      porIdentificar: { name: 'Laura Prueba', email: 'laura@ejemplo.com', phone: '+5491155551234', dni: '40111222' },
    });
  });

  test('cancelada en Cal.com: el turno se cancela', async () => {
    expect((await enviar(reserva('reserva2', '40111222', 'BOOKING_CANCELLED'))).status).toBe(200);
    expect(await turno('cal-reserva2')).toMatchObject({ status: 'cancelado', cancelReason: 'Cancelado en Cal.com' });
  });

  test('sin firma válida, no entra nada', async () => {
    expect((await enviar(reserva('reserva3', '55123456'), 'otro-secreto')).status).toBe(401);
    expect((await fs.doc(`organizations/${ORG}/appointments/cal-reserva3`).get()).exists).toBe(false);
  });
});
