/**
 * Entorno común de los tests de reglas: proyecto de demostración, usuarios de prueba y datos base.
 * Los usuarios son ficticios y solo existen en el emulador.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

export const PROYECTO = 'demo-pediatric-os';
export const ORG = 'org-demo';
export const AHORA = '2026-10-17T10:00:00-03:00';

export const USUARIOS = {
  medico: { uid: 'medico-1', claims: { rol: 'medico', organizationId: ORG } },
  asistente: { uid: 'asistente-1', claims: { rol: 'asistente', organizationId: ORG } },
  /** Adulto con acceso a p-tomas. */
  lucia: { uid: 'g-lucia', claims: { rol: 'familia', organizationId: ORG } },
  /** Adulto con acceso a p-olivia (otra familia). */
  paula: { uid: 'g-paula', claims: { rol: 'familia', organizationId: ORG } },
  /** Adulto con el portal deshabilitado. */
  diego: { uid: 'g-diego', claims: { rol: 'familia', organizationId: ORG } },
  /** Usuario con sesión pero sin rol. */
  sinRol: { uid: 'sin-rol', claims: {} },
  /** Médico de otra organización. */
  otraOrg: { uid: 'medico-otra', claims: { rol: 'medico', organizationId: 'org-otra' } },
} as const;
export type Quien = keyof typeof USUARIOS;

export async function crearEntorno(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') },
  });
}

export function como(env: RulesTestEnvironment, quien: Quien | 'anonimo') {
  if (quien === 'anonimo') return env.unauthenticatedContext();
  const u = USUARIOS[quien];
  return env.authenticatedContext(u.uid, u.claims);
}

/** Firma que exigen las reglas en toda escritura del cliente. */
export const firma = (uid: string, extra: Record<string, unknown> = {}) => ({
  organizationId: ORG, createdBy: uid, updatedBy: uid, createdAt: AHORA, updatedAt: AHORA, ...extra,
});

export const r = (...partes: string[]) => ['organizations', ORG, ...partes].join('/');

/** Datos base, cargados sin reglas. */
export async function sembrar(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const set = (ruta: string, datos: Record<string, unknown>) => setDoc(doc(db, ruta), datos);
    const base = firma('medico-1');
    await set(`organizations/${ORG}`, { name: 'Consultorio de demostración', demo: true });
    await set(r('settings', 'agenda'), { ...base, bufferMin: 20 });
    await set(r('settings', 'ia'), { ...base, enabled: false });
    await set(r('settings', 'vacunas'), { ...base, calendarioVerificado: false });
    await set(r('patients', 'p-tomas'), { ...base, firstName: 'Tomás', lastName: 'Ruiz Ferreyra', demo: true });
    await set(r('patients', 'p-olivia'), { ...base, firstName: 'Olivia', lastName: 'Benítez', demo: true });
    await set(r('guardians', 'g-lucia'), { ...base, authUid: 'g-lucia', firstName: 'Lucía', email: 'lucia@ejemplo.com', phone: '+5491155550101', portalEnabled: true });
    await set(r('guardians', 'g-paula'), { ...base, authUid: 'g-paula', firstName: 'Paula', email: 'paula@ejemplo.com', portalEnabled: true });
    await set(r('guardians', 'g-sinmail'), { ...base, authUid: 'g-sinmail', firstName: 'Sin', email: '', portalEnabled: false });
    await set(r('guardians', 'g-lucia', 'addresses', 'a1'), { ...base, street: 'Libertador 2210', locality: 'Olivos' });
    await set(r('portalAccess', 'g-lucia'), { enabled: true, patientIds: ['p-tomas'] });
    // Lo que entra desde Make (lo crea el servidor, con su firma).
    const make = firma('make');
    await set(r('interesados', 'i1'), { ...make, nombre: 'Laura', email: 'laura@ejemplo.com', telefono: null, origen: 'web', estado: 'nuevo', recibidoAt: AHORA });
    await set(r('admisiones', 'ad1'), { ...make, interesadoId: 'i1', mensaje: 'Mensaje privado', respuestas: [] });
    await set(r('triage', 'tr1'), { ...make, appointmentId: null, respuestas: [], revisadoAt: null });
    await set(r('transcripciones', 'pl1'), { ...make, texto: 'Transcripción', estado: 'pendiente' });
    await set(r('aiInteractions', 'ai1'), { organizationId: ORG, action: 'resumir_historia', patientId: 'p-tomas', resultado: { resumen: 'x' }, aceptado: null });
    await set(r('portalAccess', 'g-paula'), { enabled: true, patientIds: ['p-olivia'] });
    await set(r('portalAccess', 'g-diego'), { enabled: false, patientIds: ['p-tomas'] });
    await set(r('clinical', 'p-tomas', 'problems', 'pr1'), { ...base, patientId: 'p-tomas', description: 'Problema oculto', visibleToFamily: false });
    await set(r('clinical', 'p-tomas', 'allergies', 'al1'), { ...base, patientId: 'p-tomas', allergen: 'Referida de prueba', status: 'referida' });
    await set(r('clinical', 'p-tomas', 'notes', 'n-borrador'), { ...base, patientId: 'p-tomas', consultationId: 'c1', version: 1, status: 'borrador', findings: 'x', plan: 'y', familySummary: 'z' });
    await set(r('clinical', 'p-tomas', 'notes', 'n-aprobada'), { ...base, patientId: 'p-tomas', consultationId: 'c0', version: 1, status: 'aprobada', findings: 'x', plan: 'y', familySummary: 'z', approvedBy: 'medico-1', approvedAt: AHORA });
    await set(r('clinical', 'p-tomas', 'certificates', 'cert1'), { ...base, patientId: 'p-tomas', status: 'emitido', body: 'Certifico que…' });
    await set(r('clinical', 'p-tomas', 'followUps', 'fu1'), { ...base, patientId: 'p-tomas', status: 'pendiente', message: 'Hola', dueAt: AHORA });
    await set(r('clinical', 'p-tomas', 'fever', 'f1'), { ...base, patientId: 'p-tomas', origin: 'medico', kind: 'toma', temperatureC: 38.5 });
    await set(r('portal', 'p-tomas', 'summaries', 's1'), { text: 'Resumen aprobado para la familia' });
    await set(r('portal', 'p-olivia', 'summaries', 's1'), { text: 'Resumen de Olivia' });
    await set(r('clinical', 'p-tomas', 'vaccineDoses', 'vd-1'), { ...base, patientId: 'p-tomas', vaccine: 'BCG', dose: 'Única', status: 'pendiente', source: 'calendario' });
    await set(r('clinical', 'p-tomas', 'medications', 'me-1'), { ...base, patientId: 'p-tomas', drug: 'x', dose: 'x', startDate: '2026-10-01' });
    await set(r('clinical', 'p-tomas', 'background', 'ant-p-tomas'), { ...base, patientId: 'p-tomas', habits: 'x' });
    await set(r('appointments', 't1'), { ...base, status: 'confirmado', date: '2026-10-17' });
    await set(r('appointments', 't1', 'history', 'h1'), { organizationId: ORG, appointmentId: 't1', action: 'crear' });
    await set(r('agendaDays', '2026-10-17'), { organizationId: ORG, bloques: {} });
    await set(r('auditLog', 'au1'), { action: 'create', actorId: 'medico-1' });
    await set(r('outbox', 'ev1'), { type: 'turno.confirmado', status: 'pendiente' });
    await set(r('notifications', 'nt1'), { recipientUid: 'medico-1', text: 'Aviso' });
    await set(r('consents', 'cs1'), { ...firma('g-lucia'), guardianUid: 'g-lucia', kind: 'portal' });
  });
}
