/**
 * Guardar un turno con la regla 2 del prompt maestro: dos turnos confirmados nunca se
 * superponen, buffer incluido (docs/ETAPA_0_PROPUESTA.md, sección 7).
 *
 * Todo pasa en UNA transacción de Firestore:
 * 1. Lee el turno, la configuración de la agenda y los `agendaDays` del día y sus vecinos.
 * 2. Si el turno va a quedar confirmado y choca con otro confirmado, rechaza.
 * 3. Arma los avisos que no bloquean (fuera de horario, bloqueos, zona, solicitudes sin confirmar).
 *    Si hay avisos y no se aceptaron, devuelve los avisos y no escribe nada.
 * 4. Escribe el turno, actualiza los `agendaDays` y suma la entrada al historial.
 * Si dos confirmaciones llegan a la vez, las dos escriben el mismo `agendaDays`: Firestore
 * reintenta una y esa ve el bloque ocupado. No pueden ganar las dos.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { db } from '../config';
import { encolarEvento } from '../outbox/encolar';
import type { TipoEvento } from '../outbox/eventos';
import {
  CONFIG_AGENDA_INICIAL, avisosDeTurno, bloqueDe, choqueConConfirmados, diaDe, diasVecinos, ocupaLugar,
  type AccionTurno, type Aviso, type BloqueOcupado, type Bloqueo, type ConfigAgenda,
} from '../../../shared/agenda';
import { resumen, type Turno } from './datos';
import { isoArgentina } from '../../../shared/fechaHora';

export type Resultado = { estado: 'guardado'; id: string; avisos: Aviso[] } | { estado: 'avisos'; avisos: Aviso[] };

type Accion = AccionTurno | 'crear' | 'solicitud';

export async function leerConfig(org: string, tx?: Transaction): Promise<ConfigAgenda> {
  const ref = db().doc(`organizations/${org}/settings/agenda`);
  const snap = tx ? await tx.get(ref) : await ref.get();
  const d = snap.data() ?? {};
  return {
    horarios: Array.isArray(d.horarios) && d.horarios.length === 7 ? d.horarios : CONFIG_AGENDA_INICIAL.horarios,
    duracionMin: { ...CONFIG_AGENDA_INICIAL.duracionMin, ...(d.duracionMin ?? {}) },
    bufferMin: typeof d.bufferMin === 'number' ? d.bufferMin : CONFIG_AGENDA_INICIAL.bufferMin,
    zonas: Array.isArray(d.zonas) && d.zonas.length > 0 ? d.zonas : CONFIG_AGENDA_INICIAL.zonas,
  };
}

/** Qué evento sale para Make (solo identificadores, horario y modalidad: nada clínico ni la dirección). */
function eventoDe(accion: Accion, antes: Turno | null, despues: Turno): TipoEvento | null {
  switch (accion) {
    case 'solicitud': return 'turno.solicitado';
    case 'crear': return despues.status === 'confirmado' ? 'turno.confirmado' : null;
    case 'confirmar': return 'turno.confirmado';
    case 'reprogramar': return antes && antes.status !== 'solicitado' ? 'turno.reprogramado' : null;
    case 'cancelar': return 'turno.cancelado';
    case 'en_camino': return 'turno.en_camino';
    default: return null;
  }
}

/** Acciones que pueden cambiar el horario o el estado a uno que ocupa lugar: revisan choques y avisos. */
const REVISAN: Accion[] = ['crear', 'solicitud', 'confirmar', 'reprogramar', 'editar'];

/**
 * Corre la transacción. `armar` recibe el turno actual (o null si es nuevo) y devuelve cómo queda;
 * valida ahí mismo si la acción está permitida.
 */
export async function guardarTurno(p: {
  org: string;
  uid: string;
  ref: DocumentReference;
  accion: Accion;
  armar: (actual: Turno | null, config: ConfigAgenda) => Turno;
  aceptarAvisos?: boolean;
  motivo?: string;
}): Promise<Resultado> {
  const { org, uid, ref, accion } = p;
  const base = `organizations/${org}`;
  let evento: { tipo: TipoEvento; turno: Turno } | null = null;

  const resultado = await db().runTransaction<Resultado>(async (tx) => {
    // ---- Lecturas (todas antes de escribir) ----
    const snap = await tx.get(ref);
    const antes = snap.exists ? (snap.data() as Turno) : null;
    const config = await leerConfig(org, tx);
    const despues = p.armar(antes, config);

    const diaNuevo = diaDe(despues.start);
    const dias = new Set(diasVecinos(diaNuevo));
    if (antes) dias.add(antes.day);
    const refsDias = [...dias].map((d) => db().doc(`${base}/agendaDays/${d}`));
    const docsDias = await Promise.all(refsDias.map((r) => tx.get(r)));
    const bloquesPorDia = new Map(docsDias.map((d) => [d.id, { ...((d.data()?.bloques ?? {}) as Record<string, BloqueOcupado>) }]));

    let avisos: Aviso[] = [];
    if (REVISAN.includes(accion)) {
      // Choque con confirmados: lo decide `agendaDays` (es lo que traba la transacción).
      if (ocupaLugar(despues.status)) {
        const otros = diasVecinos(diaNuevo).flatMap((d) =>
          Object.entries(bloquesPorDia.get(d) ?? {}).filter(([id]) => id !== ref.id).map(([, b]) => b));
        const choque = choqueConConfirmados(bloqueDe(despues.start, despues.durationMin), otros, config.bufferMin);
        if (choque) throw new HttpsError('failed-precondition', choque.mensaje);
      }
      // Avisos que no bloquean.
      const [turnosCerca, bloqueos] = await Promise.all([
        tx.get(db().collection(`${base}/appointments`).where('day', 'in', diasVecinos(diaNuevo))),
        tx.get(db().collection(`${base}/blocks`).where('hasta', '>=', `${diasVecinos(diaNuevo)[0]}`)),
      ]);
      avisos = avisosDeTurno({
        turno: { id: ref.id, start: despues.start, durationMin: despues.durationMin, modality: despues.modality, locality: despues.address ? despues.address.locality || despues.address.text : '' },
        quedaConfirmado: ocupaLugar(despues.status),
        otros: turnosCerca.docs.map((d) => ({ id: d.id, ...(d.data() as Turno) })),
        config,
        bloqueos: bloqueos.docs.map((d) => d.data() as Bloqueo),
      }).filter((a) => !a.bloquea);
      // Solo frenan si cambió algo que los provoca (horario, estado o dirección).
      const cambioRelevante = !antes || antes.start !== despues.start || antes.durationMin !== despues.durationMin
        || antes.status !== despues.status || JSON.stringify(antes.address) !== JSON.stringify(despues.address);
      if (avisos.length > 0 && cambioRelevante && !p.aceptarAvisos) return { estado: 'avisos', avisos };
    }

    // ---- Escrituras ----
    tx.set(ref, despues);
    // Bloques ocupados: sale del día anterior, entra en el nuevo si ocupa lugar.
    const cambiados = new Set<string>();
    const previos = antes ? bloquesPorDia.get(antes.day) : undefined;
    if (antes && previos?.[ref.id]) {
      delete previos[ref.id];
      cambiados.add(antes.day);
    }
    if (ocupaLugar(despues.status)) {
      bloquesPorDia.get(diaNuevo)![ref.id] = bloqueDe(despues.start, despues.durationMin);
      cambiados.add(diaNuevo);
    }
    for (const d of cambiados) {
      tx.set(db().doc(`${base}/agendaDays/${d}`), { organizationId: org, bloques: bloquesPorDia.get(d), updatedAt: isoArgentina() });
    }
    tx.set(ref.collection('history').doc(), {
      organizationId: org,
      appointmentId: ref.id,
      at: isoArgentina(),
      /** Milisegundos: ordena el historial aunque haya varios cambios en el mismo minuto. */
      atMs: Date.now(),
      actorId: uid,
      action: accion,
      before: resumen(antes),
      after: resumen(despues),
      ...(p.motivo ? { reason: p.motivo } : {}),
    });

    const tipo = eventoDe(accion, antes, despues);
    if (tipo) evento = { tipo, turno: despues };
    return { estado: 'guardado', id: ref.id, avisos };
  });

  // El evento sale después de la transacción (si la transacción se reintenta, no se duplica).
  const ev = evento as { tipo: TipoEvento; turno: Turno } | null;
  if (ev) {
    await encolarEvento(org, ev.tipo, {
      appointmentId: ref.id,
      familyId: ev.turno.familyId,
      start: ev.turno.start,
      durationMin: ev.turno.durationMin,
      modality: ev.turno.modality,
    });
  }
  return resultado;
}
