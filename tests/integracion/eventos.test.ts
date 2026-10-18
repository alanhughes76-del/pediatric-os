/**
 * Eventos para Make (Etapa 8a) en el emulador: los que salen de cambios en la base y los programados.
 * Usa su propia organización (`org-eventos`) para no mezclarse con las otras pruebas.
 * Sin MAKE_WEBHOOK_URL los eventos quedan "sin_destino": no se simula ningún envío.
 */
import { initializeApp as initAdmin, deleteApp as deleteAdmin, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { correrAvisosDiarios, correrAvisosHorarios } from '../../functions/src/outbox/programadosTriggers';
import { idUnico } from '../../functions/src/outbox/encolar';

const ORG = 'org-eventos';
const base = `organizations/${ORG}`;
const firma = { organizationId: ORG, createdBy: 'medico-x', createdAt: '2026-10-01', updatedBy: 'medico-x', updatedAt: '2026-10-01' };
let admin: App;
let fs: Firestore;

async function esperar<T>(leer: () => Promise<T | undefined>, ms = 15000): Promise<T> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { const v = await leer(); if (v) return v; await new Promise((r) => setTimeout(r, 250)); }
  throw new Error('No apareció el evento a tiempo');
}
const eventoDe = (tipo: string, campo: string, valor: string) => async () =>
  (await fs.collection(`${base}/outbox`).where('type', '==', tipo).get()).docs.map((d) => d.data()).find((e) => e.data?.[campo] === valor);

beforeAll(async () => {
  admin = initAdmin({ projectId: 'demo-pediatric-os' }, 'eventos-admin');
  fs = getFirestore(admin);
  await fs.doc(`${base}/patients/p-ev`).set({ ...firma, familyId: 'f-ev', firstName: 'Lola', lastName: 'Evento', birthDate: '2025-01-01', sex: 'F' });
  await fs.doc(`${base}/guardians/g-ev`).set({ ...firma, familyId: 'f-ev', firstName: 'Ana', lastName: 'Evento', email: 'ana.evento@ejemplo.com', phone: '+5491155550000', contactPreference: 'email' });
  await fs.doc(`${base}/relationships/r-ev`).set({ ...firma, patientId: 'p-ev', guardianId: 'g-ev', type: 'madre', isPrimary: true, validFrom: '2025-01-01' });
});
afterAll(async () => { await deleteAdmin(admin); });

describe('eventos que salen de cambios', () => {
  test('alta de familia: solo identificadores y nombre (sistema)', async () => {
    await fs.doc(`${base}/families/f-ev`).set({ ...firma, name: 'Familia Evento' });
    const ev = await esperar(eventoDe('familia.creada', 'familyId', 'f-ev'));
    expect(ev).toMatchObject({ audiencia: 'sistema', plantilla: null, data: { familyId: 'f-ev', nombre: 'Familia Evento' } });
    expect(ev.data.destinatarios).toBeUndefined();
  });

  test('membresía nueva: bienvenida con plantilla y destinatarios; una renovación no la repite', async () => {
    await fs.doc(`${base}/memberships/m-ev1`).set({ ...firma, familyId: 'f-ev', plan: 'anual', status: 'activa', startDate: '2026-10-01', renewalDate: '2027-10-01', patientIds: ['p-ev'], notes: 'PRIVADO' });
    const ev = await esperar(eventoDe('membresia.alta', 'membershipId', 'm-ev1'));
    expect(ev.plantilla).toBe('bienvenida_membresia');
    expect(ev.data.destinatarios).toEqual([{ guardianId: 'g-ev', nombre: 'Ana', email: 'ana.evento@ejemplo.com', telefono: '+5491155550000', preferencia: 'email' }]);
    expect(ev.data.pacientes).toEqual([{ patientId: 'p-ev', nombre: 'Lola' }]);
    expect(JSON.stringify(ev)).not.toContain('PRIVADO');
    await fs.doc(`${base}/memberships/m-ev2`).set({ ...firma, familyId: 'f-ev', plan: 'anual', status: 'activa', startDate: '2027-10-01', renewalDate: '2028-10-01', patientIds: ['p-ev'] });
    await new Promise((r) => setTimeout(r, 3000));
    expect(await eventoDe('membresia.alta', 'membershipId', 'm-ev2')()).toBeUndefined();
  });

  test('fiebre anotada por la familia: aviso al Dr. sin la temperatura', async () => {
    await fs.doc(`${base}/clinical/p-ev/fever/fv-ev`).set({ ...firma, patientId: 'p-ev', kind: 'toma', at: '2026-10-17T10:00:00-03:00', temperatureC: 38.7, origin: 'familia' });
    const ev = await esperar(eventoDe('fiebre.registro_nuevo', 'feverId', 'fv-ev'));
    expect(ev.audiencia).toBe('medico');
    expect(JSON.stringify(ev)).not.toContain('38.7');
    // El médico tiene el contacto de la familia para responder por el puente de Telegram.
    expect(ev.data.destinatarios[0].telefono).toBe('+5491155550000');
  });

  test('un evento apagado en Configuración queda registrado, pero no sale', async () => {
    await fs.doc(`${base}/settings/automatizaciones`).set({ ...firma, apagados: ['familia.creada'] });
    await fs.doc(`${base}/families/f-ev-apagada`).set({ ...firma, name: 'Familia Apagada' });
    const ev = await esperar(eventoDe('familia.creada', 'familyId', 'f-ev-apagada'));
    expect(ev.status).toBe('apagado');
    await fs.doc(`${base}/settings/automatizaciones`).set({ ...firma, apagados: [] });
  });
});

describe('avisos programados', () => {
  test('recordatorio 24 h: sale una sola vez por turno', async () => {
    const ahora = Date.parse('2026-10-17T10:00:00-03:00');
    await fs.doc(`${base}/appointments/t-ev`).set({ ...firma, status: 'confirmado', start: '2026-10-18T10:00:00-03:00', durationMin: 45, type: 'control', modality: 'domicilio', familyId: 'f-ev', patientIds: ['p-ev'] });
    expect((await correrAvisosHorarios(ORG, ahora))['turno.recordatorio_24h']).toBe(1);
    expect((await correrAvisosHorarios(ORG, ahora))['turno.recordatorio_24h']).toBe(0);
    const ev = (await fs.doc(`${base}/outbox/${idUnico('turno.recordatorio_24h', 't-ev_2026-10-18T10:00:00-03:00')}`).get()).data()!;
    expect(ev).toMatchObject({ audiencia: 'familia', data: { appointmentId: 't-ev', start: '2026-10-18T10:00:00-03:00' } });
    expect(ev.data.destinatarios).toHaveLength(1);
  });

  test('diarios: vacunas solo con el calendario verificado; membresía por renovar y pago vencido', async () => {
    await fs.doc(`${base}/clinical/p-ev/vaccineDoses/d-ev`).set({ ...firma, patientId: 'p-ev', vaccine: 'VACUNA X', dose: '1ª', status: 'pendiente', dueDate: '2026-10-20' });
    await fs.doc(`${base}/memberships/m-ev3`).set({ ...firma, familyId: 'f-ev3', plan: 'anual', status: 'activa', startDate: '2025-11-01', renewalDate: '2026-11-01', patientIds: [] });
    await fs.doc(`${base}/memberships/m-ev4`).set({ ...firma, familyId: 'f-ev4', plan: 'semestral', status: 'activa', startDate: '2026-04-01', renewalDate: '2026-10-01', patientIds: [] });

    const sinVerificar = await correrAvisosDiarios(ORG, '2026-10-17', '2026-10-17T08:00:00-03:00');
    expect(sinVerificar['vacuna.proxima']).toBe(0);
    expect(sinVerificar['membresia.por_renovar']).toBe(1);
    expect(sinVerificar['pago.vencido']).toBe(1);

    await fs.doc(`${base}/settings/vacunas`).set({ ...firma, calendarioVerificado: true });
    const verificado = await correrAvisosDiarios(ORG, '2026-10-17', '2026-10-17T08:00:00-03:00');
    expect(verificado['vacuna.proxima']).toBe(1);
    expect(verificado['membresia.por_renovar']).toBe(0);
    const vac = (await fs.doc(`${base}/outbox/${idUnico('vacuna.proxima', 'd-ev')}`).get()).data()!;
    expect(JSON.stringify(vac)).not.toContain('VACUNA X');
  });
});
