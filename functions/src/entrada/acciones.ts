/**
 * Qué hace Pediatric OS con cada cosa que entra desde Make. Nada se aprueba solo: lo que necesita
 * criterio queda para el Dr. (aviso en la campana). Lo clínico o sensible va a colecciones que lee
 * solo el médico (admisiones, triage, transcripciones); el asistente ve el contacto de un interesado.
 */
import { db, hoyArgentina } from '../config';
import { isoArgentina } from '../../../shared/fechaHora';
import { CATALOGO, esTipoEvento } from '../../../shared/eventos';
import {
  familiaPorTexto, fechasDeNacimiento, leerContacto, leerEstado, leerPagoTelegram, leerRespuestas, medidasDictadas, obj, texto,
  type Contacto, type TipoEntrada,
} from './leer';

const SISTEMA = 'make';
type Obj = Record<string, unknown>;
export interface Resultado { estado: number; resultado: string; cuerpo: Obj }

const ok = (resultado: string, extra: Obj = {}): Resultado => ({ estado: 200, resultado, cuerpo: { ok: true, resultado, ...extra } });
const rechazo = (estado: number, resultado: string, error: string): Resultado => ({ estado, resultado, cuerpo: { ok: false, resultado, error } });
const firma = (org: string) => { const ahora = isoArgentina(); return { organizationId: org, createdBy: SISTEMA, createdAt: ahora, updatedBy: SISTEMA, updatedAt: ahora }; };

/** Aviso en la campana del Dr. (a cada profesional). */
async function avisarAlDr(org: string, kind: string, titulo: string, href: string) {
  const medicos = await db().collection(`organizations/${org}/professionals`).get();
  for (const m of medicos.docs) {
    await db().collection(`organizations/${org}/notifications`).add({ organizationId: org, recipientUid: m.id, kind, titulo, href, createdAt: isoArgentina(), readAt: null });
  }
}

/** Registro en Comunicaciones (sin texto: solo de qué se trató). */
async function registrarComunicacion(org: string, c: Obj) {
  await db().collection(`organizations/${org}/communications`).add({ ...firma(org), at: isoArgentina(), status: 'registrado', ...c });
}

/** Adulto cargado con ese email o teléfono (si hay uno). */
async function adultoPorContacto(org: string, c: Contacto) {
  const guardians = db().collection(`organizations/${org}/guardians`);
  for (const [campo, valor] of [['email', c.email], ['phone', c.telefono]] as const) {
    if (!valor) continue;
    const q = await guardians.where(campo, '==', valor).limit(2).get();
    if (q.size >= 1) return { id: q.docs[0].id, familyId: (q.docs[0].data().familyId as string | undefined) ?? null, nombre: String(q.docs[0].data().firstName ?? '') };
  }
  return null;
}

const nombreFamilia = async (org: string, familyId: string | null) =>
  (familyId ? String((await db().doc(`organizations/${org}/families/${familyId}`).get()).data()?.name ?? '') : '') || 'Familia sin identificar';

// ---------- Formulario web y admisión (Tally) ----------

async function interesado(org: string, origen: 'web' | 'tally', d: Obj): Promise<Resultado> {
  const c = leerContacto(d);
  if (!c.email && !c.telefono) return rechazo(422, 'sin_contacto', 'Falta un email o un teléfono válido.');
  const mensaje = texto(d.mensaje ?? d.message, 3000);
  const respuestas = leerRespuestas(d.respuestas);
  const adulto = await adultoPorContacto(org, c);

  // Una familia ya cargada: no es un interesado nuevo. Se avisa y se registra.
  if (adulto) {
    const fam = await nombreFamilia(org, adulto.familyId);
    await registrarComunicacion(org, { familyId: adulto.familyId, kind: 'consulta_web', channel: 'otro', direction: 'entrante', classification: 'administrativo', subject: origen === 'web' ? 'Escribió por la web' : 'Completó el formulario de admisión' });
    if (mensaje || respuestas.length) await db().collection(`organizations/${org}/admisiones`).add({ ...firma(org), origen, familyId: adulto.familyId, guardianId: adulto.id, mensaje, respuestas, recibidaAt: isoArgentina() });
    await avisarAlDr(org, 'interesado', `${origen === 'web' ? 'Escribió por la web' : 'Formulario de admisión'} · ${fam}`, adulto.familyId ? `/medico/familia/${adulto.familyId}` : '/medico/familias');
    return ok('familia_existente', { familyId: adulto.familyId });
  }

  const ref = await db().collection(`organizations/${org}/interesados`).add({
    ...firma(org), origen, nombre: c.nombre, email: c.email, telefono: c.telefono, zona: texto(d.zona, 100) || null, estado: 'nuevo', recibidoAt: isoArgentina(),
  });
  // El mensaje y las respuestas (pueden ser de salud) los lee solo el médico.
  if (mensaje || respuestas.length) await db().collection(`organizations/${org}/admisiones`).add({ ...firma(org), origen, interesadoId: ref.id, mensaje, respuestas, recibidaAt: isoArgentina() });
  await registrarComunicacion(org, { kind: 'consulta_web', channel: 'otro', direction: 'entrante', classification: 'administrativo', subject: `${origen === 'web' ? 'Consulta por la web' : 'Formulario de admisión'}: ${c.nombre || 'sin nombre'}`, interesadoId: ref.id });
  await avisarAlDr(org, 'interesado', `${origen === 'web' ? 'Nueva consulta por la web' : 'Nueva admisión'} · ${c.nombre || 'sin nombre'}`, '/medico/interesados');
  return ok('interesado_nuevo', { interesadoId: ref.id });
}

// ---------- Triage de urgencia (Tally) ----------

async function triage(org: string, d: Obj): Promise<Resultado> {
  const c = leerContacto(d);
  const respuestas = leerRespuestas(d.respuestas);
  if (respuestas.length === 0) return rechazo(422, 'sin_respuestas', 'El triage llegó sin respuestas.');
  const adulto = await adultoPorContacto(org, c);

  // La solicitud de urgencia de esa familia (o de ese contacto) más cercana a ahora, dentro de 24 horas.
  const ahora = Date.now();
  const turnos = await db().collection(`organizations/${org}/appointments`).where('status', 'in', ['solicitado', 'pendiente', 'confirmado']).get();
  const candidato = turnos.docs
    .map((t) => ({ id: t.id, ...t.data() }) as Obj & { id: string })
    .filter((t) => String(t.type ?? '').startsWith('urgencia') && Math.abs(Date.parse(String(t.start)) - ahora) <= 24 * 3_600_000)
    .filter((t) => (adulto?.familyId && t.familyId === adulto.familyId)
      || (c.email && obj(t.porIdentificar).email === c.email) || (c.telefono && obj(t.porIdentificar).phone === c.telefono))
    .sort((a, b) => Math.abs(Date.parse(String(a.start)) - ahora) - Math.abs(Date.parse(String(b.start)) - ahora))[0];

  const ref = await db().collection(`organizations/${org}/triage`).add({
    ...firma(org), appointmentId: candidato?.id ?? null, familyId: adulto?.familyId ?? null, contacto: c, respuestas, recibidoAt: isoArgentina(), revisadoAt: null,
  });
  const fam = adulto ? await nombreFamilia(org, adulto.familyId) : c.nombre || 'contacto sin identificar';
  await avisarAlDr(org, 'triage', `Triage de urgencia · ${fam}`, candidato ? `/medico/turno/${candidato.id}` : `/medico/triage/${ref.id}`);
  return ok(candidato ? 'adjuntado_a_la_solicitud' : 'sin_solicitud', { triageId: ref.id, appointmentId: candidato?.id ?? null });
}

// ---------- Encuesta (Tally) ----------

async function encuesta(org: string, d: Obj): Promise<Resultado> {
  const c = leerContacto(d);
  const adulto = await adultoPorContacto(org, c);
  const puntaje = typeof d.puntaje === 'number' ? ` (${d.puntaje})` : '';
  await registrarComunicacion(org, { familyId: adulto?.familyId ?? null, kind: 'encuesta', channel: 'otro', direction: 'entrante', classification: 'administrativo', subject: `Respuesta a la encuesta${puntaje}` });
  return ok('registrada');
}

// ---------- Plaud ----------

async function plaud(org: string, d: Obj): Promise<Resultado> {
  const transcripcion = texto(d.texto ?? d.transcripcion, 60_000);
  if (transcripcion.length < 20) return rechazo(422, 'sin_texto', 'La transcripción llegó vacía.');
  const grabadaAt = texto(d.fecha ?? d.grabadaAt, 40) || isoArgentina();
  const fechas = fechasDeNacimiento(transcripcion);
  const sugeridos: string[] = [];
  for (const f of fechas) {
    const q = await db().collection(`organizations/${org}/patients`).where('birthDate', '==', f).get();
    for (const p of q.docs) if (!p.data().archivedAt && !sugeridos.includes(p.id)) sugeridos.push(p.id);
  }
  const ref = await db().collection(`organizations/${org}/transcripciones`).add({
    ...firma(org), texto: transcripcion, grabadaAt, recibidaAt: isoArgentina(), fechasNacimiento: fechas, pacientesSugeridos: sugeridos,
    medidas: medidasDictadas(transcripcion), estado: 'pendiente',
  });
  await avisarAlDr(org, 'plaud', 'Transcripción de Plaud para revisar', `/medico/plaud/${ref.id}`);
  return ok('borrador_pendiente', { transcripcionId: ref.id, sugeridos: sugeridos.length });
}

// ---------- Pago por Telegram ----------

async function pago(org: string, d: Obj): Promise<Resultado> {
  const p = leerPagoTelegram(d);
  if (p.monto === null) return rechazo(422, 'sin_monto', 'No entendí el monto. Escribilo así: pago 150000 transferencia Apellido.');
  const familias = (await db().collection(`organizations/${org}/families`).get()).docs.filter((f) => !f.data().archivedAt).map((f) => ({ id: f.id, name: String(f.data().name ?? '') }));
  const familyId = familiaPorTexto(familias, p.resto);
  const ref = await db().collection(`organizations/${org}/payments`).add({
    ...firma(org), ...(familyId ? { familyId } : {}), date: hoyArgentina(), amount: p.monto,
    // Si no se dijo, se propone pesos y transferencia: el Dr. lo revisa antes de confirmar.
    currency: p.moneda ?? 'ARS', method: p.medio ?? 'transferencia',
    concept: `Telegram: ${texto(d.texto ?? d.text, 200)}`, status: 'a_confirmar',
  });
  await avisarAlDr(org, 'pago', `Pago para confirmar · ${familyId ? familias.find((f) => f.id === familyId)!.name : 'familia sin identificar'}`, `/medico/pago?id=${ref.id}`);
  return ok('a_confirmar', { paymentId: ref.id, familia: familyId ? familias.find((f) => f.id === familyId)!.name : null, monto: p.monto, moneda: p.moneda ?? 'ARS' });
}

// ---------- Mensajería ----------

const CANALES: Record<string, string> = { email: 'email', mail: 'email', telegram: 'telegram', telefono: 'telefono', llamada: 'telefono', pacientex: 'pacientex' };
const canal = (v: unknown) => CANALES[texto(v, 30).toLowerCase()] ?? 'otro';

/** Estado de entrega de algo que mandó Make (por el id del evento). Queda en Comunicaciones. */
async function estadoEntrega(org: string, d: Obj): Promise<Resultado> {
  const eventId = texto(d.eventId, 300);
  const estado = leerEstado(d.estado);
  if (!eventId || !estado) return rechazo(422, 'incompleto', 'Faltan eventId o un estado válido (entregado, fallido, enviado).');
  const ev = (await db().doc(`organizations/${org}/outbox/${eventId}`).get()).data();
  if (!ev || !esTipoEvento(String(ev.type))) return rechazo(404, 'evento_desconocido', 'No hay un evento con ese id.');
  const data = obj(ev.data);
  // El resumen ya tiene su comunicación: se actualiza esa.
  if (typeof data.communicationId === 'string') {
    await db().doc(`organizations/${org}/communications/${data.communicationId}`).update({ status: estado, updatedBy: SISTEMA, updatedAt: isoArgentina() });
    return ok('actualizado');
  }
  const tipo = String(ev.type);
  const recordatorio = /recordatorio|proxim|por_renovar|vacuna/.test(tipo);
  await db().doc(`organizations/${org}/communications/ev-${eventId}`).set({
    ...firma(org), eventId, kind: recordatorio ? 'recordatorio' : 'aviso', channel: canal(d.canal), direction: 'saliente',
    classification: tipo === 'resumen.envio_aprobado' ? 'clinico' : 'administrativo',
    subject: CATALOGO[tipo as keyof typeof CATALOGO].descripcion, at: isoArgentina(), status: estado,
    ...(typeof data.familyId === 'string' ? { familyId: data.familyId } : {}), ...(typeof data.patientId === 'string' ? { patientId: data.patientId } : {}),
  }, { merge: true });
  return ok('registrado');
}

/** Lo que entra por el número de avisos: se registra (sin el texto) y se vincula a la familia si se reconoce. */
async function mensajeEntrante(org: string, d: Obj): Promise<Resultado> {
  const c = leerContacto(d);
  if (!c.telefono && !c.email) return rechazo(422, 'sin_contacto', 'Falta el teléfono o el email de quien escribió.');
  const adulto = await adultoPorContacto(org, c);
  await registrarComunicacion(org, { familyId: adulto?.familyId ?? null, kind: 'mensaje', channel: canal(d.canal), direction: 'entrante', classification: 'administrativo', subject: adulto ? `Mensaje de ${adulto.nombre}` : 'Mensaje de un número no cargado' });
  return ok(adulto ? 'vinculado' : 'sin_vincular');
}

export async function procesarEntrada(org: string, tipo: TipoEntrada, datos: Obj): Promise<Resultado> {
  switch (tipo) {
    case 'formulario.web': return interesado(org, 'web', datos);
    case 'tally.admision': return interesado(org, 'tally', datos);
    case 'tally.triage_urgencia': return triage(org, datos);
    case 'tally.feedback': return encuesta(org, datos);
    case 'plaud.transcripcion': return plaud(org, datos);
    case 'telegram.pago': return pago(org, datos);
    case 'mensajeria.estado': return estadoEntrega(org, datos);
    case 'mensajeria.entrante': return mensajeEntrante(org, datos);
  }
}
