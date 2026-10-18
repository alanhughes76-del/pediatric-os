/**
 * Quita el segundo factor de una cuenta (por ejemplo, si el médico perdió el teléfono). Después
 * entra solo con la contraseña y lo vuelve a activar en Configuración › Seguridad.
 * Necesita credenciales de administrador del proyecto (`gcloud auth application-default login`).
 *
 *   npx tsx scripts/quitar-segundo-factor.ts --proyecto pediatric-os --email dr@…
 *
 * `--emulador` lo prueba contra demo-pediatric-os.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const opcion = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const emulador = process.argv.includes('--emulador');
const proyecto = emulador ? 'demo-pediatric-os' : opcion('proyecto');
const email = opcion('email');
if (!proyecto || !email) {
  console.error('Uso: npx tsx scripts/quitar-segundo-factor.ts --proyecto <id> --email <email>');
  process.exit(1);
}
if (emulador) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
}
initializeApp({ projectId: proyecto });

(async () => {
  const usuario = await getAuth().getUserByEmail(email).catch(() => null);
  if (!usuario) { console.error(`No hay un usuario con ${email} en ${proyecto}.`); process.exit(1); }
  const cuantos = usuario.multiFactor?.enrolledFactors.length ?? 0;
  await getAuth().updateUser(usuario.uid, { multiFactor: { enrolledFactors: null } });
  const org = usuario.customClaims?.organizationId;
  if (typeof org === 'string') {
    await getFirestore().collection(`organizations/${org}/auditLog`).add({
      at: new Date().toISOString(), actorId: 'quitar-segundo-factor', actorType: 'sistema', action: 'modificar',
      path: `users/${usuario.uid}`, entity: 'users', entityId: usuario.uid, detail: `segundo factor quitado (${cuantos})`,
    });
  }
  console.log(`Listo: ${email} ya no tiene segundo factor (${cuantos} quitado${cuantos === 1 ? '' : 's'}). Activalo de nuevo en Configuración › Seguridad.`);
})();
