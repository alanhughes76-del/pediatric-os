/**
 * Tests de las reglas de Firestore (corren en el emulador: `npm run test:reglas`).
 * Cada bloque prueba una promesa del prompt maestro: quién lee y quién escribe qué.
 */
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore';
import { AHORA, ORG, USUARIOS, como, crearEntorno, firma, r, sembrar, type Quien } from './entorno';

let env: RulesTestEnvironment;

beforeAll(async () => { env = await crearEntorno(); });
beforeEach(async () => { await env.clearFirestore(); await sembrar(env); });
afterAll(async () => { await env.cleanup(); });

const db = (quien: Quien | 'anonimo') => como(env, quien).firestore();
const leer = (quien: Quien | 'anonimo', ruta: string) => getDoc(doc(db(quien), ruta));
const uid = (quien: Quien) => USUARIOS[quien].uid;

describe('datos clínicos: solo el médico', () => {
  const problema = r('clinical', 'p-tomas', 'problems', 'pr1');

  test('el médico lee un problema de salud', async () => {
    await assertSucceeds(leer('medico', problema));
  });
  test.each<Quien | 'anonimo'>(['asistente', 'lucia', 'sinRol', 'otraOrg', 'anonimo'])('%s no puede leer datos clínicos', async (quien) => {
    await assertFails(leer(quien, problema));
  });
  test('la familia no puede listar los problemas ni las alergias de su propio hijo', async () => {
    await assertFails(getDocs(collection(db('lucia'), r('clinical', 'p-tomas', 'problems'))));
    await assertFails(getDocs(collection(db('lucia'), r('clinical', 'p-tomas', 'allergies'))));
  });
  test('el asistente no puede escribir datos clínicos', async () => {
    await assertFails(setDoc(doc(db('asistente'), r('clinical', 'p-tomas', 'problems', 'pr2')), firma(uid('asistente'), { patientId: 'p-tomas', description: 'x' })));
  });
  test('el médico carga un problema con su firma', async () => {
    await assertSucceeds(setDoc(doc(db('medico'), r('clinical', 'p-tomas', 'problems', 'pr2')), firma(uid('medico'), { patientId: 'p-tomas', description: 'Nuevo' })));
  });
  test('no se puede firmar con el uid de otro', async () => {
    await assertFails(setDoc(doc(db('medico'), r('clinical', 'p-tomas', 'problems', 'pr3')), firma('otro-usuario', { patientId: 'p-tomas', description: 'x' })));
  });
  test('nada clínico se borra', async () => {
    await assertFails(deleteDoc(doc(db('medico'), problema)));
  });
});

describe('nota clínica: inmutable una vez aprobada', () => {
  const borrador = r('clinical', 'p-tomas', 'notes', 'n-borrador');
  const aprobada = r('clinical', 'p-tomas', 'notes', 'n-aprobada');

  test('el médico edita un borrador', async () => {
    await assertSucceeds(updateDoc(doc(db('medico'), borrador), { findings: 'cambio', updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('una nota aprobada no se puede modificar escribiendo directo en la base', async () => {
    await assertFails(updateDoc(doc(db('medico'), aprobada), { findings: 'cambio', updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('el cliente no puede aprobar una nota (lo hace el servidor)', async () => {
    await assertFails(updateDoc(doc(db('medico'), borrador), { status: 'aprobada', updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('no se puede crear una nota ya aprobada', async () => {
    await assertFails(setDoc(doc(db('medico'), r('clinical', 'p-tomas', 'notes', 'n-nueva')),
      firma(uid('medico'), { patientId: 'p-tomas', consultationId: 'c2', version: 1, status: 'aprobada' })));
  });
  test('se puede crear un borrador', async () => {
    await assertSucceeds(setDoc(doc(db('medico'), r('clinical', 'p-tomas', 'notes', 'n-nueva')),
      firma(uid('medico'), { patientId: 'p-tomas', consultationId: 'c2', version: 1, status: 'borrador', findings: '', plan: '', familySummary: '' })));
  });
  test('no se puede cambiar la versión de un borrador', async () => {
    await assertFails(updateDoc(doc(db('medico'), borrador), { version: 2, updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('una nota no se borra', async () => {
    await assertFails(deleteDoc(doc(db('medico'), borrador)));
  });
});

describe('certificados y seguimientos', () => {
  test('el cliente no emite ni modifica certificados', async () => {
    await assertFails(updateDoc(doc(db('medico'), r('clinical', 'p-tomas', 'certificates', 'cert1')), { status: 'anulado', updatedBy: uid('medico'), updatedAt: AHORA }));
    await assertFails(setDoc(doc(db('medico'), r('clinical', 'p-tomas', 'certificates', 'cert2')), firma(uid('medico'), { patientId: 'p-tomas', status: 'emitido' })));
  });
  test('el médico edita el mensaje y resuelve un seguimiento', async () => {
    await assertSucceeds(updateDoc(doc(db('medico'), r('clinical', 'p-tomas', 'followUps', 'fu1')), { message: 'Nuevo texto', status: 'resuelto', resolvedAt: AHORA, updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('el vencimiento de un seguimiento no se cambia a mano', async () => {
    await assertFails(updateDoc(doc(db('medico'), r('clinical', 'p-tomas', 'followUps', 'fu1')), { dueAt: '2027-01-01', updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('el cliente no crea seguimientos (nacen al aprobar una nota con bandera)', async () => {
    await assertFails(setDoc(doc(db('medico'), r('clinical', 'p-tomas', 'followUps', 'fu2')), firma(uid('medico'), { patientId: 'p-tomas', status: 'pendiente' })));
  });
});

describe('registro de fiebre', () => {
  const toma = (quien: Quien, extra: Record<string, unknown> = {}) =>
    firma(uid(quien), { patientId: 'p-tomas', kind: 'toma', temperatureC: 38.6, origin: 'familia', ...extra });

  test('un adulto con acceso carga una toma de su hijo', async () => {
    await assertSucceeds(setDoc(doc(db('lucia'), r('clinical', 'p-tomas', 'fever', 'f2')), toma('lucia')));
  });
  test('un adulto sin acceso a ese chico no puede cargar', async () => {
    await assertFails(setDoc(doc(db('paula'), r('clinical', 'p-tomas', 'fever', 'f2')), toma('paula')));
  });
  test('un adulto con el portal deshabilitado no puede cargar', async () => {
    await assertFails(setDoc(doc(db('diego'), r('clinical', 'p-tomas', 'fever', 'f2')), toma('diego')));
  });
  test('la familia no puede marcarla como revisada ni firmar como médico', async () => {
    await assertFails(setDoc(doc(db('lucia'), r('clinical', 'p-tomas', 'fever', 'f2')), toma('lucia', { reviewedAt: AHORA })));
    await assertFails(setDoc(doc(db('lucia'), r('clinical', 'p-tomas', 'fever', 'f2')), toma('lucia', { origin: 'medico' })));
  });
  test('la familia no lee el registro clínico (lee la copia del portal)', async () => {
    await assertFails(leer('lucia', r('clinical', 'p-tomas', 'fever', 'f1')));
  });
  test('el médico la marca revisada, pero no puede cambiar la temperatura', async () => {
    const f = doc(db('medico'), r('clinical', 'p-tomas', 'fever', 'f1'));
    await assertSucceeds(updateDoc(f, { reviewedAt: AHORA, reviewedBy: uid('medico'), updatedBy: uid('medico'), updatedAt: AHORA }));
    await assertFails(updateDoc(f, { temperatureC: 37, updatedBy: uid('medico'), updatedAt: AHORA }));
  });
});

describe('portal: cada adulto ve solo a sus hijos', () => {
  test('Lucía lee los resúmenes de Tomás', async () => {
    await assertSucceeds(getDocs(collection(db('lucia'), r('portal', 'p-tomas', 'summaries'))));
  });
  test('Lucía no lee los de Olivia, que es de otra familia', async () => {
    await assertFails(getDocs(collection(db('lucia'), r('portal', 'p-olivia', 'summaries'))));
  });
  test('un adulto con el portal deshabilitado no lee nada', async () => {
    await assertFails(getDocs(collection(db('diego'), r('portal', 'p-tomas', 'summaries'))));
  });
  test.each<Quien>(['asistente', 'sinRol'])('%s no lee el portal', async (quien) => {
    await assertFails(getDocs(collection(db(quien), r('portal', 'p-tomas', 'summaries'))));
  });
  test('nadie escribe en el portal desde la app', async () => {
    await assertFails(setDoc(doc(db('medico'), r('portal', 'p-tomas', 'summaries', 's2')), { text: 'x' }));
  });
  test('cada adulto lee solo su propio acceso', async () => {
    await assertSucceeds(leer('lucia', r('portalAccess', 'g-lucia')));
    await assertFails(leer('lucia', r('portalAccess', 'g-paula')));
  });
});

describe('adultos responsables', () => {
  const lucia = r('guardians', 'g-lucia');
  const cambio = (quien: Quien, campos: Record<string, unknown>) =>
    updateDoc(doc(db(quien), lucia), { ...campos, updatedBy: uid(quien), updatedAt: AHORA });

  test('el adulto lee su ficha y no la de otro', async () => {
    await assertSucceeds(leer('lucia', lucia));
    await assertFails(leer('lucia', r('guardians', 'g-paula')));
  });
  test('el adulto actualiza su teléfono en formato E.164', async () => {
    await assertSucceeds(cambio('lucia', { phone: '+5491166667777' }));
  });
  test('un teléfono que no está en E.164 se rechaza', async () => {
    await assertFails(cambio('lucia', { phone: '011 5555-0101' }));
  });
  test('el adulto no puede habilitarse ni cambiar su nombre', async () => {
    await assertFails(cambio('lucia', { portalEnabled: false }));
    await assertFails(cambio('lucia', { firstName: 'Otra' }));
  });
  test('el adulto actualiza sus direcciones', async () => {
    await assertSucceeds(updateDoc(doc(db('lucia'), r('guardians', 'g-lucia', 'addresses', 'a1')), { street: 'Nueva 123', updatedBy: uid('lucia'), updatedAt: AHORA }));
    await assertFails(updateDoc(doc(db('paula'), r('guardians', 'g-lucia', 'addresses', 'a1')), { street: 'x', updatedBy: uid('paula'), updatedAt: AHORA }));
  });
  test('habilitar el portal es decisión del médico', async () => {
    await assertFails(updateDoc(doc(db('asistente'), r('guardians', 'g-paula')), { portalEnabled: false, updatedBy: uid('asistente'), updatedAt: AHORA }));
    await assertSucceeds(updateDoc(doc(db('medico'), r('guardians', 'g-paula')), { portalEnabled: false, updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('sin email no se puede habilitar el portal', async () => {
    await assertFails(updateDoc(doc(db('medico'), r('guardians', 'g-sinmail')), { portalEnabled: true, updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('un adulto nuevo arranca sin acceso al portal', async () => {
    const nuevo = (portalEnabled: boolean) => setDoc(doc(db('asistente'), r('guardians', `g-nuevo-${portalEnabled}`)),
      firma(uid('asistente'), { firstName: 'Nuevo', email: 'nuevo@ejemplo.com', portalEnabled }));
    await assertSucceeds(nuevo(false));
    await assertFails(nuevo(true));
  });
});

describe('administrativo y agenda', () => {
  test('el asistente lee pacientes y turnos', async () => {
    await assertSucceeds(leer('asistente', r('patients', 'p-tomas')));
    await assertSucceeds(leer('asistente', r('appointments', 't1')));
  });
  test('la familia no lee la lista de pacientes', async () => {
    await assertFails(leer('lucia', r('patients', 'p-tomas')));
  });
  test('el alta de pacientes pasa por el servidor (control de duplicados)', async () => {
    await assertFails(setDoc(doc(db('medico'), r('patients', 'p-nuevo')), firma(uid('medico'), { firstName: 'X' })));
  });
  test('nadie escribe turnos directo: lo hace el servidor con su transacción', async () => {
    await assertFails(setDoc(doc(db('medico'), r('appointments', 't2')), firma(uid('medico'), { status: 'confirmado', date: '2026-10-17' })));
    await assertFails(updateDoc(doc(db('medico'), r('appointments', 't1')), { status: 'cancelado', updatedBy: uid('medico'), updatedAt: AHORA }));
  });
  test('el asistente no lee la configuración de la IA', async () => {
    await assertFails(leer('asistente', r('settings', 'ia')));
    await assertSucceeds(leer('asistente', r('settings', 'agenda')));
  });
  test('el médico de otra organización no ve nada', async () => {
    await assertFails(leer('otraOrg', r('patients', 'p-tomas')));
    await assertFails(leer('otraOrg', `organizations/${ORG}`));
  });
});

describe('trazabilidad', () => {
  test('el médico lee la auditoría, pero nadie la escribe ni la borra', async () => {
    await assertSucceeds(leer('medico', r('auditLog', 'au1')));
    await assertFails(updateDoc(doc(db('medico'), r('auditLog', 'au1')), { action: 'otra' }));
    await assertFails(deleteDoc(doc(db('medico'), r('auditLog', 'au1'))));
    await assertFails(setDoc(doc(db('medico'), r('auditLog', 'au2')), { action: 'falsa' }));
  });
  test('el asistente no lee la auditoría', async () => {
    await assertFails(leer('asistente', r('auditLog', 'au1')));
  });
  test('los eventos para Make los escribe solo el servidor', async () => {
    await assertFails(setDoc(doc(db('medico'), r('outbox', 'ev2')), { type: 'falso' }));
  });
  test('cada uno lee solo sus avisos y solo puede marcarlos leídos', async () => {
    await assertSucceeds(leer('medico', r('notifications', 'nt1')));
    await assertFails(leer('asistente', r('notifications', 'nt1')));
    await assertSucceeds(updateDoc(doc(db('medico'), r('notifications', 'nt1')), { readAt: AHORA }));
    await assertFails(updateDoc(doc(db('medico'), r('notifications', 'nt1')), { text: 'otro' }));
  });
  test('un consentimiento no se edita: solo se revoca, una vez', async () => {
    const c = doc(db('lucia'), r('consents', 'cs1'));
    await assertFails(updateDoc(c, { kind: 'foto', updatedBy: uid('lucia'), updatedAt: AHORA }));
    await assertSucceeds(updateDoc(c, { revokedAt: AHORA, updatedBy: uid('lucia'), updatedAt: AHORA }));
    await assertFails(updateDoc(c, { revokedAt: '2026-10-18', updatedBy: uid('lucia'), updatedAt: AHORA }));
  });
  test('un usuario sin sesión no lee su ficha de usuario ni la de otros', async () => {
    await assertFails(leer('anonimo', 'users/medico-1'));
    await assertSucceeds(leer('medico', 'users/medico-1'));
  });
});
