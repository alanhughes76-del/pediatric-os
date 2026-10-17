/**
 * Ingreso de las familias con enlace mágico (prompt maestro 4; propuesta, sección 6).
 *
 * pedirEnlace({ email }) — sin sesión.
 *   - Si el email es de un adulto con el portal habilitado, arma un código de un solo uso que vale
 *     15 minutos, guarda solo su huella y manda el mail por SMTP (cuenta del Dr., Secret Manager).
 *   - La respuesta es siempre la misma, exista o no el email (no revela quién es paciente).
 *   - Sin SMTP configurado no sale ningún mail. Solo en el emulador se devuelve el enlace para probar.
 *
 * entrarConEnlace({ token }) — sin sesión.
 *   - Valida el código (existe, no venció, no se usó), lo marca usado en una transacción, se
 *     asegura de que el adulto tenga su usuario y su acceso calculado, y devuelve un token de
 *     sesión de Firebase con el rol "familia". El ingreso queda en el registro de accesos.
 * Nada de esto escribe datos personales en los logs.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { createTransport } from 'nodemailer';
import { auth, db } from '../config';
import { ORGANIZACION_ID, URL_APP } from '../params';
import { recalcularAcceso } from '../acceso/triggers';
import { isoArgentina } from '../../../shared/fechaHora';
import {
  PEDIDOS_POR_VENTANA, VALIDEZ_MS, codigoConFormaValida, emailValido, enlaceDeIngreso, estadoDelEnlace, huella,
  mailDelEnlace, MENSAJE_ENLACE, normalizarEmail, nuevoCodigo,
} from './enlaceLogica';

const SMTP_USUARIO = defineSecret('SMTP_USUARIO');
const SMTP_CLAVE = defineSecret('SMTP_CLAVE');

const enEmulador = () => process.env.FUNCTIONS_EMULATOR === 'true';
const RESPUESTA = { ok: true, mensaje: 'Si el email está habilitado, te llega un enlace para entrar. Vale 15 minutos.' };

export const pedirEnlace = onCall<{ email?: string }>({ secrets: [SMTP_USUARIO, SMTP_CLAVE] }, async (req) => {
  const email = normalizarEmail(req.data?.email);
  if (!emailValido(email)) throw new HttpsError('invalid-argument', 'Revisá el email.');
  const org = ORGANIZACION_ID.value();
  if (!org) throw new HttpsError('unavailable', 'El ingreso todavía no está configurado.');
  const base = `organizations/${org}`;

  const adultos = await db().collection(`${base}/guardians`).where('email', '==', email).limit(2).get();
  const adulto = adultos.docs.find((d) => d.data().portalEnabled === true && !d.data().archivedAt);
  if (!adulto) return RESPUESTA;

  // Como mucho unos pocos pedidos por ventana de 15 minutos.
  const ahora = Date.now();
  const recientes = await db().collection(`${base}/magicLinks`).where('guardianId', '==', adulto.id).where('createdAtMs', '>', ahora - VALIDEZ_MS).get();
  if (recientes.size >= PEDIDOS_POR_VENTANA) return RESPUESTA;

  const codigo = nuevoCodigo();
  await db().doc(`${base}/magicLinks/${huella(codigo)}`).set({
    organizationId: org, guardianId: adulto.id, createdAtMs: ahora, expiresAtMs: ahora + VALIDEZ_MS, usedAt: null, createdAt: isoArgentina(ahora),
  });
  const enlace = enlaceDeIngreso(URL_APP.value() || 'http://localhost:8083', codigo);

  const usuario = SMTP_USUARIO.value();
  const clave = SMTP_CLAVE.value();
  if (usuario && clave) {
    const mail = mailDelEnlace(String(adulto.data().firstName ?? ''), enlace);
    await createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: usuario, pass: clave } })
      .sendMail({ from: `Dr. Alan Hughes <${usuario}>`, to: email, subject: mail.asunto, text: mail.texto });
    return RESPUESTA;
  }
  logger.warn('Enlace mágico creado sin SMTP configurado: no se mandó ningún mail.');
  // Solo en el emulador, para poder probar sin mandar mails.
  return enEmulador() ? { ...RESPUESTA, enlaceDePrueba: enlace } : RESPUESTA;
});

export const entrarConEnlace = onCall<{ token?: string }>(async (req) => {
  const codigo = req.data?.token;
  if (!codigoConFormaValida(codigo)) throw new HttpsError('failed-precondition', MENSAJE_ENLACE.invalido);
  const org = ORGANIZACION_ID.value();
  if (!org) throw new HttpsError('unavailable', 'El ingreso todavía no está configurado.');
  const base = `organizations/${org}`;
  const ref = db().doc(`${base}/magicLinks/${huella(codigo)}`);

  // Un solo uso: se valida y se marca en la misma transacción.
  const guardianId = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const estado = estadoDelEnlace(snap.data(), Date.now());
    if (estado !== 'valido') throw new HttpsError('failed-precondition', MENSAJE_ENLACE[estado]);
    tx.update(ref, { usedAt: isoArgentina() });
    return String(snap.data()!.guardianId);
  });

  const adultoRef = db().doc(`${base}/guardians/${guardianId}`);
  const adulto = (await adultoRef.get()).data();
  if (!adulto || adulto.portalEnabled !== true || adulto.archivedAt || !adulto.email) {
    throw new HttpsError('permission-denied', 'Tu acceso al portal no está habilitado. Escribile al Dr. por PacienteX.');
  }

  // Usuario de Auth del adulto (se crea en el primer ingreso).
  const uid = typeof adulto.authUid === 'string' && adulto.authUid ? adulto.authUid : guardianId;
  try {
    await auth().getUser(uid);
  } catch {
    await auth().createUser({ uid, email: String(adulto.email), emailVerified: true });
  }
  if (adulto.authUid !== uid) await adultoRef.update({ authUid: uid, updatedBy: 'sistema', updatedAt: isoArgentina() });
  // El acceso (portalAccess y el rol) tiene que estar listo antes de entrar.
  await recalcularAcceso(org, guardianId);

  await db().collection(`${base}/auditLog`).add({
    at: isoArgentina(), actorId: guardianId, actorType: 'persona', action: 'login', detail: 'enlace por email', entity: 'guardians', entityId: guardianId,
  });
  const token = await auth().createCustomToken(uid, { rol: 'familia', organizationId: org });
  return { token };
});
