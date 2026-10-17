/**
 * Forma de un turno en Firestore y validación de lo que llega desde la app.
 * Lógica pura (sin Firestore), con tests en tests/funciones.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import {
  MODALIDADES, TIPOS_TURNO, diaDe, msDe, zonaDe,
  type ConfigAgenda, type EstadoTurno, type ModalidadTurno, type OrigenTurno, type TipoTurno,
} from '../../../shared/agenda';

/** Dirección de la visita: es una copia; cambiarla no toca la dirección guardada de la familia. */
export interface DireccionVisita { text: string; locality: string; addressId?: string }

/** Contacto de quien pidió el turno cuando todavía no se sabe qué familia es (Cal.com sin DNI conocido). */
export interface PorIdentificar { name: string; email: string; phone: string; dni: string }

export interface Turno {
  organizationId: string;
  start: string;
  /** Día de inicio en Argentina (AAAA-MM-DD), para buscar por día. */
  day: string;
  durationMin: number;
  type: TipoTurno;
  modality: ModalidadTurno;
  familyId: string | null;
  patientIds: string[];
  address: DireccionVisita | null;
  zone: string | null;
  reason: string;
  opsNotes: string;
  status: EstadoTurno;
  origin: OrigenTurno;
  cancelReason?: string;
  onTheWayAt?: string;
  calBookingUid?: string;
  porIdentificar?: PorIdentificar;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

/** Campos que se pueden editar sin mover el horario. */
export type CamposEditables = Partial<Pick<Turno, 'type' | 'modality' | 'familyId' | 'patientIds' | 'address' | 'reason' | 'opsNotes'>>;

const cadena = (v: unknown, nombre: string, max: number): string => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new HttpsError('invalid-argument', `${nombre} no es válido.`);
  if (v.length > max) throw new HttpsError('invalid-argument', `${nombre} es demasiado largo (máximo ${max} caracteres).`);
  return v.trim();
};
const esId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);

export function validarInicio(v: unknown): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v) || Number.isNaN(msDe(v))) {
    throw new HttpsError('invalid-argument', 'Revisá la fecha y la hora del turno.');
  }
  return v;
}

export function validarDuracion(v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 10 || v > 480) {
    throw new HttpsError('invalid-argument', 'La duración tiene que estar entre 10 y 480 minutos.');
  }
  return v;
}

/** Valida los campos editables que vinieron (los que no vinieron quedan afuera). */
export function validarCampos(d: Record<string, unknown>): CamposEditables {
  const c: CamposEditables = {};
  if ('type' in d) {
    if (!TIPOS_TURNO.includes(d.type as TipoTurno)) throw new HttpsError('invalid-argument', 'El tipo de turno no es válido.');
    c.type = d.type as TipoTurno;
  }
  if ('modality' in d) {
    if (!MODALIDADES.includes(d.modality as ModalidadTurno)) throw new HttpsError('invalid-argument', 'La modalidad no es válida.');
    c.modality = d.modality as ModalidadTurno;
  }
  if ('familyId' in d) {
    if (d.familyId !== null && !esId(d.familyId)) throw new HttpsError('invalid-argument', 'La familia no es válida.');
    c.familyId = (d.familyId as string | null) ?? null;
  }
  if ('patientIds' in d) {
    const ids = d.patientIds;
    if (!Array.isArray(ids) || ids.length > 8 || !ids.every(esId)) throw new HttpsError('invalid-argument', 'Los pacientes no son válidos.');
    c.patientIds = [...new Set(ids)];
  }
  if ('address' in d) {
    const a = d.address as Record<string, unknown> | null;
    if (a === null) c.address = null;
    else if (typeof a !== 'object') throw new HttpsError('invalid-argument', 'La dirección no es válida.');
    else {
      const text = cadena(a.text, 'La dirección', 200);
      const locality = cadena(a.locality, 'La localidad', 100);
      if (a.addressId !== undefined && !esId(a.addressId)) throw new HttpsError('invalid-argument', 'La dirección no es válida.');
      c.address = text || locality ? { text, locality, ...(a.addressId ? { addressId: a.addressId as string } : {}) } : null;
    }
  }
  if ('reason' in d) c.reason = cadena(d.reason, 'El motivo', 200);
  if ('opsNotes' in d) c.opsNotes = cadena(d.opsNotes, 'Las notas operativas', 1000);
  return c;
}

/** Turno nuevo armado por el médico o el asistente. */
export function turnoNuevo(p: {
  org: string; uid: string; ahora: string; datos: Record<string, unknown>; config: ConfigAgenda; origin?: OrigenTurno;
}): Turno {
  const d = p.datos;
  const campos = validarCampos({ modality: 'domicilio', familyId: null, patientIds: [], address: null, reason: '', opsNotes: '', ...d });
  if (!campos.type) throw new HttpsError('invalid-argument', 'Elegí el tipo de turno.');
  const start = validarInicio(d.start);
  const durationMin = d.durationMin === undefined ? p.config.duracionMin[campos.type] : validarDuracion(d.durationMin);
  if (campos.type !== 'prenatal' && campos.patientIds!.length === 0) throw new HttpsError('invalid-argument', 'Elegí al menos un paciente.');
  if (campos.type === 'prenatal' && !campos.familyId) throw new HttpsError('invalid-argument', 'Un turno prenatal va con la familia: elegila.');
  return completar({
    organizationId: p.org,
    start,
    day: diaDe(start),
    durationMin,
    type: campos.type,
    modality: campos.modality!,
    familyId: campos.familyId ?? null,
    patientIds: campos.patientIds!,
    address: campos.address ?? null,
    zone: null,
    reason: campos.reason ?? '',
    opsNotes: campos.opsNotes ?? '',
    status: d.confirmar === true ? 'confirmado' : 'pendiente',
    origin: p.origin ?? 'medico',
    createdBy: p.uid,
    createdAt: p.ahora,
    updatedBy: p.uid,
    updatedAt: p.ahora,
  }, p.config);
}

/** Recalcula lo derivado: día de inicio y zona de la dirección. */
export function completar(t: Turno, config: ConfigAgenda): Turno {
  const lugar = t.address ? t.address.locality || t.address.text : '';
  return { ...t, day: diaDe(t.start), zone: t.modality === 'domicilio' ? zonaDe(lugar, config.zonas) : null };
}

/** Lo que va al historial y a los avisos: estado y horario. */
export const resumen = (t: Turno | null) => (t ? { status: t.status, start: t.start, durationMin: t.durationMin } : null);
