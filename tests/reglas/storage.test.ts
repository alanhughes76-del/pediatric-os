/**
 * Tests de las reglas de Cloud Storage (emulador).
 */
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, getMetadata } from 'firebase/storage';
import { ORG, como, crearEntorno, type Quien } from './entorno';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await crearEntorno(); });
beforeEach(async () => { await env.clearStorage(); });
afterAll(async () => { await env.cleanup(); });

const archivo = `orgs/${ORG}/patients/p-tomas/certificados/cert1.pdf`;
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
const subir = (quien: Quien, ruta = archivo, contentType = 'application/pdf') =>
  uploadBytes(ref(como(env, quien).storage(), ruta), pdf, { contentType });

test('el médico sube un PDF del paciente y lo lee', async () => {
  await assertSucceeds(subir('medico'));
  await assertSucceeds(getBytes(ref(como(env, 'medico').storage(), archivo)));
});

test('el asistente y la familia no suben ni leen archivos del paciente', async () => {
  await assertFails(subir('asistente'));
  await assertFails(subir('lucia'));
  await env.withSecurityRulesDisabled(async (ctx) => { await uploadBytes(ref(ctx.storage(), archivo), pdf, { contentType: 'application/pdf' }); });
  await assertFails(getBytes(ref(como(env, 'lucia').storage(), archivo)));
  await assertFails(getBytes(ref(como(env, 'asistente').storage(), archivo)));
});

test('solo se aceptan PDF e imágenes', async () => {
  await assertFails(subir('medico', `orgs/${ORG}/patients/p-tomas/x.exe`, 'application/octet-stream'));
});

test('un archivo subido no se pisa', async () => {
  const s = como(env, 'medico').storage();
  // Ruta propia de este test: el emulador no siempre limpia bien una ruta ya usada con clearStorage.
  const archivo = `orgs/${ORG}/patients/p-tomas/certificados/no-se-pisa.pdf`;
  await assertSucceeds(uploadBytes(ref(s, archivo), pdf, { contentType: 'application/pdf' }));
  // Se espera a que el emulador registre el primer archivo antes de intentar pisarlo.
  await getMetadata(ref(s, archivo));
  await assertFails(uploadBytes(ref(s, archivo), pdf, { contentType: 'application/pdf' }));
});

test('cualquier otra ruta está cerrada', async () => {
  await assertFails(subir('medico', 'publico/archivo.pdf'));
});
