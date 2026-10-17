/** Cuenta lo cargado por `npm run sembrar` (solo emulador). Lo usa la verificación de la etapa. */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
initializeApp({ projectId: 'demo-pediatric-os' });

(async () => {
  const db = getFirestore();
  const org = 'organizations/org-demo';
  const contar = async (ruta: string) => (await db.collection(ruta).count().get()).data().count;
  const grupo = async (nombre: string) => (await db.collectionGroup(nombre).count().get()).data().count;
  const medico = await getAuth().getUser('medico-demo');
  const lucia = (await db.doc(`${org}/portalAccess/g-lucia`).get()).data();
  const tel = (await db.doc(`${org}/guardians/g-lucia`).get()).data()?.phone;
  console.log(JSON.stringify({
    pacientes: await contar(`${org}/patients`),
    adultos: await contar(`${org}/guardians`),
    notas: await grupo('notes'),
    fiebre: await grupo('fever'),
    accesos: await contar(`${org}/portalAccess`),
    claimsMedico: medico.customClaims,
    accesoLucia: lucia,
    telefonoLucia: tel,
  }, null, 1));
})();
