/**
 * Carga los datos de demostración en los EMULADORES de Firebase (nunca en un proyecto real).
 *
 *   1. npm run emuladores          (en una terminal; queda abierta)
 *   2. npm run sembrar             (en otra)
 *
 * Toma los datos ficticios de la app (src/data/mock.ts: 40 pacientes, 36 adultos) y los guarda
 * con la estructura de Firestore (docs/MODELO_DE_DATOS.md). Todo queda marcado `demo: true`.
 *
 * Usuarios de prueba (solo existen en el emulador):
 *   - Médico: medico@ejemplo.com / clave de prueba en CLAVE_MEDICO (abajo). Rol "medico".
 *   - Asistente: asistente@ejemplo.com / la misma clave. Rol "asistente" (no ve datos clínicos).
 *   - Familias: un usuario por adulto con el portal habilitado (uid = id del adulto, sin clave:
 *     entran por enlace mágico, que llega en la Etapa 6).
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type WriteBatch } from 'firebase-admin/firestore';
import { datosDeEjemplo, DOCTOR_ID } from '../src/data/mock';
import { normalizarTelefono } from '../src/lib/telefono';
import { calcularAcceso } from '../functions/src/acceso/calcular';
import { CONFIG } from '../src/config';

const PROYECTO = 'demo-pediatric-os';
const ORG = 'org-demo';
const MEDICO_UID = 'medico-demo';
const ASISTENTE_UID = 'asistente-demo';
/** Clave de prueba, solo para el emulador. */
const CLAVE_MEDICO = 'demo-pediatric-os-2026';

// Seguridad: este script solo habla con los emuladores.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
if (!PROYECTO.startsWith('demo-')) throw new Error('El script de demostración solo corre contra un proyecto demo-.');

initializeApp({ projectId: PROYECTO });
const db = getFirestore();
const auth = getAuth();
const ahora = new Date().toISOString();
const hoy = ahora.slice(0, 10);

/** Campos que exigen las reglas y la auditoría, más la marca de demostración. */
const firma = (createdBy: string, createdAt?: string) => ({
  organizationId: ORG,
  createdBy: createdBy === DOCTOR_ID ? MEDICO_UID : createdBy,
  createdAt: createdAt ?? ahora,
  updatedBy: 'sistema',
  updatedAt: ahora,
  demo: true,
});

/** Escribe en tandas de 400 (el límite de Firestore es 500 por tanda). */
async function escribir(filas: { ruta: string; datos: Record<string, unknown> }[]) {
  let batch: WriteBatch = db.batch();
  let n = 0;
  for (const f of filas) {
    batch.set(db.doc(f.ruta), f.datos);
    if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  await batch.commit();
}

/** Quita `id` (va en la ruta) y los campos vacíos (Firestore no acepta undefined). */
function limpio<T extends { id: string }>(x: T): Record<string, unknown> {
  const { id: _id, ...resto } = x;
  return Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined));
}

async function usuario(uid: string, email: string, claims: Record<string, string>, password?: string) {
  try { await auth.deleteUser(uid); } catch { /* no existía */ }
  await auth.createUser({ uid, email, ...(password ? { password } : {}), emailVerified: true });
  await auth.setCustomUserClaims(uid, claims);
}

async function main() {
  const d = datosDeEjemplo;
  const o = (...partes: string[]) => ['organizations', ORG, ...partes].join('/');
  const filas: { ruta: string; datos: Record<string, unknown> }[] = [];
  const agregar = (ruta: string, datos: Record<string, unknown>) => filas.push({ ruta, datos });

  // Organización y configuración inicial (valores de la sección 7.16 del prompt maestro).
  agregar(`organizations/${ORG}`, { name: 'Consultorio de demostración', demo: true, createdAt: ahora });
  agregar(o('professionals', MEDICO_UID), { ...firma(DOCTOR_ID), name: d.doctor.name, mn: '111.725', mp: '448.970', signature: d.doctor.signature });
  agregar(o('settings', 'links'), { ...firma(DOCTOR_ID), pacienteXUrl: CONFIG.pacienteXUrl, calControlUrl: CONFIG.calControlUrl, calUrgenciaUrl: CONFIG.calUrgenciaUrl, recetasUrl: '' });
  agregar(o('settings', 'ia'), { ...firma(DOCTOR_ID), enabled: false });
  agregar(o('settings', 'vacunas'), { ...firma(DOCTOR_ID), calendarioVerificado: false });
  agregar(o('settings', 'membresia'), {
    ...firma(DOCTOR_ID),
    anualUSD: 2000, semestralUSD: 1000, descuentoHermano: 0.5, cambio: 'promedio BNA comprador y vendedor del día',
    visitasARS: { controlOUrgenciaDia: 150000, hermanoMismaVisita: 100000, urgenciaNocheFinDeSemanaFeriado: 190000, prenatalVideo: 70000, prenatalDomicilio: 150000 },
  });

  // Administrativo
  d.families.forEach((f) => agregar(o('families', f.id), { ...limpio(f), ...firma(f.createdBy, f.createdAt), status: 'activa' }));
  d.guardians.forEach((g) => {
    const { accessEnabled, phone, ...resto } = limpio(g) as Record<string, unknown> & { accessEnabled: boolean; phone?: string };
    agregar(o('guardians', g.id), {
      ...resto,
      ...firma(g.createdBy, g.createdAt),
      phone: phone ? normalizarTelefono(phone) : null,
      contactPreference: 'whatsapp',
      portalEnabled: accessEnabled,
      authUid: accessEnabled ? g.id : null,
    });
  });
  d.addresses.forEach((a) => agregar(o('guardians', a.guardianId, 'addresses', a.id), { ...limpio(a), ...firma(a.createdBy, a.createdAt) }));
  d.relationships.forEach((r) => agregar(o('relationships', r.id), { ...limpio(r), ...firma(r.createdBy, r.createdAt) }));
  d.patients.forEach((p) => agregar(o('patients', p.id), { ...limpio(p), ...firma(p.createdBy, p.createdAt) }));
  d.memberships.forEach((m) => agregar(o('memberships', m.id), { ...limpio(m), ...firma(m.createdBy, m.createdAt) }));
  d.payments.forEach((p) => agregar(o('payments', p.id), { ...limpio(p), ...firma(p.createdBy, p.createdAt) }));

  // Clínico, por paciente
  const clinico = <T extends { id: string; patientId: string; createdBy: string; createdAt: string }>(sub: string, xs: T[], extra?: (x: T) => Record<string, unknown>) =>
    xs.forEach((x) => agregar(o('clinical', x.patientId, sub, x.id), { ...limpio(x), ...firma(x.createdBy, x.createdAt), ...(extra?.(x) ?? {}) }));
  clinico('problems', d.problems);
  clinico('allergies', d.allergies);
  clinico('consultations', d.consultations);
  clinico('growth', d.measurements);
  clinico('milestones', d.milestoneChecks);
  clinico('notes', d.notes);
  clinico('followUps', d.followUps);
  clinico('carePlan', d.carePlan);
  clinico('fever', d.fever, (f) => ({ origin: f.createdBy === DOCTOR_ID ? 'medico' : 'familia' }));
  clinico('certificates', d.certificates);
  clinico('documents', d.documents);

  // Acceso al portal (lo mismo que calcula el servidor)
  const habilitados = d.guardians.filter((g) => g.accessEnabled);
  habilitados.forEach((g) => {
    const acceso = calcularAcceso({ portalEnabled: true, email: g.email }, d.relationships.filter((r) => r.guardianId === g.id), hoy);
    agregar(o('portalAccess', g.id), { ...acceso, guardianId: g.id, updatedAt: ahora });
  });

  await escribir(filas);

  // Usuarios de prueba
  await usuario(MEDICO_UID, 'medico@ejemplo.com', { rol: 'medico', organizationId: ORG }, CLAVE_MEDICO);
  await usuario(ASISTENTE_UID, 'asistente@ejemplo.com', { rol: 'asistente', organizationId: ORG }, CLAVE_MEDICO);
  for (const g of habilitados) await usuario(g.id, g.email, { rol: 'familia', organizationId: ORG });
  await db.doc(`users/${MEDICO_UID}`).set({ rol: 'medico', organizationId: ORG, demo: true });
  await db.doc(`users/${ASISTENTE_UID}`).set({ rol: 'asistente', organizationId: ORG, demo: true });

  console.log(`Listo: ${filas.length} documentos de demostración y ${habilitados.length + 2} usuarios en el emulador (${PROYECTO}).`);
  console.log('Interfaz de los emuladores: http://127.0.0.1:4000');
}

main().catch((e) => {
  console.error('No se pudieron cargar los datos de demostración:', e instanceof Error ? e.message : e);
  console.error('¿Están corriendo los emuladores? (npm run emuladores)');
  process.exit(1);
});
