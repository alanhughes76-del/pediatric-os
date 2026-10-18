/**
 * Primer médico de un proyecto (se corre una sola vez, docs/INSTALACION.md). Después, los demás
 * roles se asignan desde la app con `asignarRol`.
 *
 * Necesita que el usuario ya exista en Authentication (creado en la consola de Firebase con
 * email y contraseña) y credenciales de administrador del proyecto en esta computadora
 * (`gcloud auth application-default login`). No crea usuarios ni contraseñas.
 *
 *   npx tsx scripts/primer-medico.ts --proyecto pediatric-os --email dr@… --organizacion org-hughes
 *
 * Con los emuladores corriendo, `--emulador` lo prueba contra demo-pediatric-os.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function opcion(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const emulador = process.argv.includes('--emulador');
const proyecto = emulador ? 'demo-pediatric-os' : opcion('proyecto');
const email = opcion('email');
const organizacion = opcion('organizacion');

if (!proyecto || !email || !organizacion || !/^[a-z0-9-]{3,40}$/.test(organizacion)) {
  console.error('Uso: npx tsx scripts/primer-medico.ts --proyecto <id> --email <email> --organizacion <id-en-minúsculas>');
  process.exit(1);
}
if (emulador) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
}

initializeApp({ projectId: proyecto });

(async () => {
  const auth = getAuth();
  const db = getFirestore();
  const usuario = await auth.getUserByEmail(email).catch(() => null);
  if (!usuario) {
    console.error(`No hay un usuario con ${email} en Authentication de ${proyecto}. Crealo primero en la consola.`);
    process.exit(1);
  }
  const antes = usuario.customClaims ?? {};
  if (antes.organizationId && antes.organizationId !== organizacion) {
    console.error(`Ese usuario ya pertenece a la organización ${antes.organizationId}. No se cambia.`);
    process.exit(1);
  }
  const ahora = new Date().toISOString();
  await auth.setCustomUserClaims(usuario.uid, { rol: 'medico', organizationId: organizacion });
  await db.doc(`organizations/${organizacion}`).set({ name: 'Consultorio del Dr. Alan Hughes', createdAt: ahora }, { merge: true });
  await db.doc(`users/${usuario.uid}`).set({ rol: 'medico', organizationId: organizacion, updatedAt: ahora, updatedBy: 'primer-medico' }, { merge: true });
  await db.collection(`organizations/${organizacion}/auditLog`).add({
    at: ahora, actorId: 'primer-medico', actorType: 'sistema', action: 'modificar', path: `users/${usuario.uid}`,
    entity: 'users', entityId: usuario.uid, changes: { rol: { antes: antes.rol ?? null, despues: 'medico' } },
  });
  console.log(`Listo: ${email} es médico de ${organizacion} en ${proyecto}. Tiene que cerrar sesión y volver a entrar.`);
  console.log(`Acordate de poner ORGANIZACION_ID=${organizacion} en functions/.env.${proyecto}.`);
})();
