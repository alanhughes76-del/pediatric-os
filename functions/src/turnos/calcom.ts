/**
 * Lectura de los webhooks de Cal.com (transición, prompt maestro 7.2). Lógica pura, con tests.
 * Cal.com firma el cuerpo con HMAC-SHA256 (hexadecimal) en el encabezado `X-Cal-Signature-256`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isoArgentina } from '../../../shared/fechaHora';
import { normalizarTelefono } from '../../../shared/telefono';
import { soloDigitos } from '../../../shared/duplicados';
import { horaDe, type TipoTurno } from '../../../shared/agenda';

export const ENCABEZADO_CAL = 'x-cal-signature-256';

export function firmaCalValida(cuerpo: Buffer | string, secreto: string, recibida: string | undefined): boolean {
  if (!recibida || !secreto) return false;
  const esperada = Buffer.from(createHmac('sha256', secreto).update(cuerpo).digest('hex'));
  const dada = Buffer.from(recibida.replace(/^sha256=/, '').trim());
  return esperada.length === dada.length && timingSafeEqual(esperada, dada);
}

export interface ReservaCal {
  evento: 'creada' | 'cancelada' | 'reprogramada' | 'otra';
  uid: string;
  /** En una reprogramación, la reserva que reemplaza. */
  anteriorUid?: string;
  start: string;
  durationMin: number;
  type: TipoTurno;
  name: string;
  email: string;
  phone: string;
  dni: string;
  address: string;
  locality: string;
  reason: string;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown): string => {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  const o = obj(v);
  return 'value' in o ? str(o.value) : '';
};

/** Busca una respuesta del formulario de Cal.com por nombre de campo (sin importar mayúsculas). */
function respuesta(responses: Obj, ...claves: string[]): string {
  for (const [k, v] of Object.entries(responses)) {
    const nombre = k.toLowerCase();
    if (claves.some((c) => nombre.includes(c))) {
      const s = str(v);
      if (s) return s;
    }
  }
  return '';
}

const EVENTOS: Record<string, ReservaCal['evento']> = {
  BOOKING_CREATED: 'creada',
  BOOKING_CANCELLED: 'cancelada',
  BOOKING_RESCHEDULED: 'reprogramada',
};

/** Tipo de turno según el evento de Cal.com: urgencia (de día o de noche), recién nacido o control. */
function tipoDe(texto: string, start: string): TipoTurno {
  const t = texto.toLowerCase();
  if (t.includes('urgencia')) {
    const h = Number(horaDe(start).slice(0, 2));
    return h >= 20 || h < 8 ? 'urgencia-noche' : 'urgencia-dia';
  }
  if (t.includes('recien') || t.includes('recién') || /\brn\b/.test(t)) return 'rn';
  return 'control';
}

/** Lee el cuerpo del webhook. Devuelve null si le faltan los datos mínimos. */
export function leerReservaCal(body: unknown): ReservaCal | null {
  const b = obj(body);
  const p = obj(b.payload);
  const uid = str(p.uid);
  const inicio = Date.parse(str(p.startTime));
  const fin = Date.parse(str(p.endTime));
  if (!uid || !/^[A-Za-z0-9_-]{1,100}$/.test(uid) || Number.isNaN(inicio)) return null;

  const start = isoArgentina(inicio);
  const responses = obj(p.responses);
  const asistente = obj(Array.isArray(p.attendees) ? p.attendees[0] : undefined);
  const ubicacion = str(p.location);
  const direccion = respuesta(responses, 'direcci', 'domicilio', 'address')
    || (ubicacion && !/^(https?:|integrations:)/.test(ubicacion) ? ubicacion : '');
  const telefono = respuesta(responses, 'telefono', 'teléfono', 'phone', 'celular', 'whatsapp') || str(asistente.phoneNumber);
  const durationMin = Number.isNaN(fin) ? 45 : Math.max(10, Math.min(480, Math.round((fin - inicio) / 60_000)));

  return {
    evento: EVENTOS[str(b.triggerEvent)] ?? 'otra',
    uid,
    anteriorUid: str(p.rescheduleUid) || str(p.fromReschedule) || undefined,
    start,
    durationMin,
    type: tipoDe(`${str(p.type)} ${str(p.title)} ${str(obj(p.eventType).slug)}`, start),
    name: (respuesta(responses, 'name', 'nombre') || str(asistente.name)).slice(0, 120),
    email: (respuesta(responses, 'email', 'correo') || str(asistente.email)).slice(0, 200),
    phone: telefono ? normalizarTelefono(telefono) ?? telefono.slice(0, 30) : '',
    dni: soloDigitos(respuesta(responses, 'dni', 'documento')).slice(0, 12),
    address: direccion.slice(0, 200),
    locality: respuesta(responses, 'localidad', 'barrio', 'partido').slice(0, 100),
    reason: (respuesta(responses, 'motivo', 'notes', 'nota') || str(p.additionalNotes) || str(p.description)).slice(0, 200),
  };
}
