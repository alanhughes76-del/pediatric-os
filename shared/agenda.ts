/**
 * Agenda y turnos (prompt maestro 6 y 7.2): lógica pura que usan la app y el servidor.
 *
 * - Entre dos turnos confirmados tiene que quedar al menos el buffer de traslado.
 * - Ocupan lugar solo los turnos confirmados (y los ya realizados). "Solicitado" y "pendiente"
 *   no ocupan: solo avisan. Cancelado y ausente liberan el horario.
 * - Superposición o buffer insuficiente entre dos confirmados BLOQUEA. Todo lo demás (fuera de
 *   horario, bloqueos, fuera de zona, choques con turnos sin confirmar) es un aviso.
 * Las horas se calculan en hora de Argentina (UTC−3 todo el año).
 */
import { isoArgentina } from './fechaHora';

export type TipoTurno = 'control' | 'urgencia-dia' | 'urgencia-noche' | 'seguimiento' | 'rn' | 'prenatal';
export type EstadoTurno = 'solicitado' | 'pendiente' | 'confirmado' | 'realizado' | 'cancelado' | 'ausente';
export type OrigenTurno = 'medico' | 'portal' | 'calcom' | 'formulario';
export type ModalidadTurno = 'domicilio' | 'telemedicina' | 'otro';
export type AccionTurno = 'pendiente' | 'confirmar' | 'reprogramar' | 'editar' | 'cancelar' | 'realizado' | 'ausente' | 'en_camino';

export const TIPOS_TURNO: TipoTurno[] = ['control', 'urgencia-dia', 'urgencia-noche', 'seguimiento', 'rn', 'prenatal'];
export const ESTADOS_TURNO: EstadoTurno[] = ['solicitado', 'pendiente', 'confirmado', 'realizado', 'cancelado', 'ausente'];
export const MODALIDADES: ModalidadTurno[] = ['domicilio', 'telemedicina', 'otro'];

export const TEXTO_TIPO_TURNO: Record<TipoTurno, string> = {
  control: 'Control',
  'urgencia-dia': 'Urgencia día',
  'urgencia-noche': 'Urgencia noche',
  seguimiento: 'Seguimiento',
  rn: 'Recién nacido',
  prenatal: 'Prenatal',
};

export const TEXTO_ESTADO_TURNO: Record<EstadoTurno, string> = {
  solicitado: 'Solicitado',
  pendiente: 'Pendiente de confirmación',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
  ausente: 'Ausente',
};

export const TEXTO_ACCION_TURNO: Record<AccionTurno | 'crear' | 'solicitud', string> = {
  crear: 'Turno creado',
  solicitud: 'Solicitud recibida',
  pendiente: 'Pasó a pendiente de confirmación',
  confirmar: 'Confirmado',
  reprogramar: 'Reprogramado',
  editar: 'Datos editados',
  cancelar: 'Cancelado',
  realizado: 'Marcado como realizado',
  ausente: 'Marcado como ausente',
  en_camino: '"Estoy en camino"',
};

// ---------- Configuración ----------

/** Franja de atención en hora local ("09:00" a "20:00"). */
export interface Franja { desde: string; hasta: string }
/** Zona de cobertura: nombre y palabras que la reconocen en la localidad de la dirección. */
export interface Zona { nombre: string; localidades: string[] }

export interface ConfigAgenda {
  /**
   * Franjas de atención por día de la semana: 0 = domingo … 6 = sábado. Es un mapa y no una
   * lista de listas porque Firestore no acepta listas dentro de listas.
   */
  horarios: Record<number, Franja[]>;
  duracionMin: Record<TipoTurno, number>;
  /** Minutos de traslado que tienen que quedar libres entre dos turnos. */
  bufferMin: number;
  zonas: Zona[];
}

/** Período bloqueado en la agenda (vacaciones, congreso…). */
export interface Bloqueo { desde: string; hasta: string; motivo?: string; archivedAt?: string }

const BARRIOS_CABA = [
  'caba', 'capital federal', 'ciudad de buenos aires', 'ciudad autonoma',
  'agronomia', 'almagro', 'balvanera', 'barracas', 'belgrano', 'boedo', 'caballito', 'chacarita', 'coghlan',
  'colegiales', 'constitucion', 'flores', 'floresta', 'la boca', 'la paternal', 'liniers', 'mataderos',
  'monte castro', 'monserrat', 'nueva pompeya', 'nunez', 'palermo', 'parque avellaneda', 'parque chacabuco',
  'parque chas', 'parque patricios', 'puerto madero', 'recoleta', 'retiro', 'saavedra', 'san cristobal',
  'san nicolas', 'san telmo', 'velez sarsfield', 'versalles', 'villa crespo', 'villa del parque',
  'villa devoto', 'villa general mitre', 'villa lugano', 'villa luro', 'villa ortuzar', 'villa pueyrredon',
  'villa real', 'villa riachuelo', 'villa santa rita', 'villa soldati', 'villa urquiza',
];

const ZONA_NORTE = [
  'vicente lopez', 'olivos', 'florida', 'munro', 'la lucila', 'carapachay', 'villa martelli',
  'san isidro', 'martinez', 'acassuso', 'beccar', 'boulogne', 'villa adelina',
  'tigre', 'nordelta', 'don torcuato', 'general pacheco', 'benavidez', 'el talar', 'rincon de milberg',
  'san fernando', 'victoria', 'virreyes', 'pilar', 'del viso', 'manzanares', 'escobar', 'garin',
  'maschwitz', 'matheu', 'exaltacion de la cruz', 'los cardales', 'capilla del senor', 'campana',
];

/**
 * Valores iniciales. Son provisorios: el Dr. los ajusta en Configuración (Etapa 7).
 * No son datos clínicos: solo organizan el día.
 */
export const CONFIG_AGENDA_INICIAL: ConfigAgenda = {
  horarios: {
    0: [],
    1: [{ desde: '09:00', hasta: '20:00' }],
    2: [{ desde: '09:00', hasta: '20:00' }],
    3: [{ desde: '09:00', hasta: '20:00' }],
    4: [{ desde: '09:00', hasta: '20:00' }],
    5: [{ desde: '09:00', hasta: '20:00' }],
    6: [{ desde: '09:00', hasta: '13:00' }],
  },
  duracionMin: { control: 45, 'urgencia-dia': 40, 'urgencia-noche': 40, seguimiento: 30, rn: 60, prenatal: 45 },
  bufferMin: 30,
  zonas: [
    { nombre: 'CABA', localidades: BARRIOS_CABA },
    { nombre: 'GBA Zona Norte', localidades: ZONA_NORTE },
  ],
};

// ---------- Horas en Argentina ----------

const MIN = 60_000;
const DIA = 24 * 60 * MIN;
const OFFSET = 3 * 60 * MIN;
const pad = (n: number) => String(n).padStart(2, '0');
const local = (ms: number) => new Date(ms - OFFSET);

export const msDe = (iso: string) => Date.parse(iso);
/** Día en Argentina: "AAAA-MM-DD". */
export const diaDe = (iso: string | number) => isoArgentina(typeof iso === 'number' ? iso : msDe(iso)).slice(0, 10);
/** Hora en Argentina: "HH:MM". */
export const horaDe = (iso: string | number) => isoArgentina(typeof iso === 'number' ? iso : msDe(iso)).slice(11, 16);
/** Día de la semana en Argentina (0 = domingo). */
export const diaSemanaDe = (ms: number) => local(ms).getUTCDay();
/** Minutos desde la medianoche en Argentina. */
const minutosDe = (ms: number) => { const d = local(ms); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const aMinutos = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** "AAAA-MM-DD" + n días. */
export function sumarDiasA(dia: string, n: number): string {
  const d = new Date(Date.parse(`${dia}T12:00:00Z`) + n * DIA);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Inicio de un turno a partir de la fecha y la hora locales. null si no es válida. */
export function inicioDe(dia: string, hhmm: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const iso = `${dia}T${hhmm}:00-03:00`;
  const ms = msDe(iso);
  if (Number.isNaN(ms) || diaDe(ms) !== dia || horaDe(ms) !== hhmm) return null;
  return iso;
}

/** Días cuyos bloques hay que mirar para un turno que empieza ese día (el buffer puede cruzar la medianoche). */
export const diasVecinos = (dia: string) => [sumarDiasA(dia, -1), dia, sumarDiasA(dia, 1)];

// ---------- Ocupación ----------

export const ocupaLugar = (estado: EstadoTurno) => estado === 'confirmado' || estado === 'realizado';
export const estaVigente = (estado: EstadoTurno) => estado !== 'cancelado' && estado !== 'ausente';

/** Bloque de un turno confirmado, tal como se guarda en `agendaDays/{día de inicio}`. */
export interface BloqueOcupado { desde: number; fin: number; hora: string }

export function bloqueDe(start: string, durationMin: number): BloqueOcupado {
  const desde = msDe(start);
  return { desde, fin: desde + durationMin * MIN, hora: horaDe(desde) };
}

/**
 * Choque contra los turnos confirmados (lo que valida la transacción del servidor).
 * Bloquea si los turnos se pisan o si entre ellos queda menos que el buffer de traslado.
 */
export function choqueConConfirmados(nuevo: BloqueOcupado, bloques: BloqueOcupado[], bufferMin: number): Aviso | null {
  const buffer = bufferMin * MIN;
  const orden = [...bloques].sort((a, b) => a.desde - b.desde);
  const pisa = orden.find((b) => nuevo.desde < b.fin && b.desde < nuevo.fin);
  if (pisa) return { tipo: 'superposicion', bloquea: true, mensaje: `Se superpone con el turno de las ${pisa.hora}.` };
  const cerca = orden.find((b) => nuevo.desde < b.fin + buffer && b.desde < nuevo.fin + buffer);
  if (cerca) return { tipo: 'buffer', bloquea: true, mensaje: `Quedan menos de ${bufferMin} min de traslado con el turno de las ${cerca.hora}.` };
  return null;
}

// ---------- Avisos ----------

export type TipoAviso = 'superposicion' | 'buffer' | 'fuera_de_horario' | 'bloqueo' | 'fuera_de_zona';
export interface Aviso { tipo: TipoAviso; mensaje: string; bloquea: boolean }

export interface TurnoAgenda {
  id: string;
  start: string;
  durationMin: number;
  status: EstadoTurno;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Zona de cobertura que corresponde a una localidad, o null si no la reconoce. */
export function zonaDe(localidad: string | undefined, zonas: Zona[]): string | null {
  if (!localidad?.trim()) return null;
  const l = normalizar(localidad);
  for (const z of zonas) {
    if (normalizar(z.nombre) === l.trim() || z.localidades.some((x) => l.includes(normalizar(x)))) return z.nombre;
  }
  return null;
}

/**
 * Avisos para un turno nuevo o movido. `quedaConfirmado` dice si el turno va a ocupar lugar:
 * solo entonces un choque con otro confirmado bloquea.
 */
export function avisosDeTurno(p: {
  turno: { id?: string; start: string; durationMin: number; modality?: ModalidadTurno; locality?: string };
  quedaConfirmado: boolean;
  otros: TurnoAgenda[];
  config: ConfigAgenda;
  bloqueos?: Bloqueo[];
}): Aviso[] {
  const { turno, config } = p;
  const avisos: Aviso[] = [];
  const desde = msDe(turno.start);
  const hasta = desde + turno.durationMin * MIN;
  const buffer = config.bufferMin * MIN;

  // Choques con otros turnos (los confirmados primero: son los que pueden bloquear).
  const otros = p.otros
    .filter((o) => o.id !== turno.id && estaVigente(o.status))
    .sort((a, b) => Number(ocupaLugar(b.status)) - Number(ocupaLugar(a.status)) || msDe(a.start) - msDe(b.start));
  for (const o of otros) {
    const oDesde = msDe(o.start);
    const oHasta = oDesde + o.durationMin * MIN;
    const real = desde < oHasta && oDesde < hasta;
    const conBuffer = desde < oHasta + buffer && oDesde < hasta + buffer;
    if (!conBuffer) continue;
    const bloquea = p.quedaConfirmado && ocupaLugar(o.status);
    const conQuien = ocupaLugar(o.status) ? `el turno de las ${horaDe(oDesde)}` : `la solicitud de las ${horaDe(oDesde)} (sin confirmar)`;
    avisos.push(real
      ? { tipo: 'superposicion', bloquea, mensaje: `Se superpone con ${conQuien}.` }
      : { tipo: 'buffer', bloquea, mensaje: `Quedan menos de ${config.bufferMin} min de traslado con ${conQuien}.` });
  }

  // Horario de atención: el turno entero tiene que caer dentro de una franja del día.
  const franjas = config.horarios[diaSemanaDe(desde)] ?? [];
  const ini = minutosDe(desde);
  const fin = ini + turno.durationMin;
  const dentro = diaDe(desde) === diaDe(hasta - 1) && franjas.some((f) => ini >= aMinutos(f.desde) && fin <= aMinutos(f.hasta));
  if (!dentro) {
    const dia = DIAS[diaSemanaDe(desde)];
    avisos.push({
      tipo: 'fuera_de_horario',
      bloquea: false,
      mensaje: franjas.length === 0
        ? `Fuera del horario de atención: el ${dia} no tiene horario cargado.`
        : `Fuera del horario de atención del ${dia} (${franjas.map((f) => `${f.desde} a ${f.hasta}`).join(' y ')}).`,
    });
  }

  // Bloqueos.
  for (const b of p.bloqueos ?? []) {
    if (b.archivedAt) continue;
    if (desde < msDe(b.hasta) && msDe(b.desde) < hasta) {
      avisos.push({ tipo: 'bloqueo', bloquea: false, mensaje: `Cae en un horario bloqueado${b.motivo ? ` (${b.motivo})` : ''}.` });
    }
  }

  // Zona de cobertura: solo para visitas a domicilio con dirección.
  if ((turno.modality ?? 'domicilio') === 'domicilio' && turno.locality?.trim() && !zonaDe(turno.locality, config.zonas)) {
    avisos.push({
      tipo: 'fuera_de_zona',
      bloquea: false,
      mensaje: `"${turno.locality.trim()}" está fuera de la zona de cobertura (${config.zonas.map((z) => z.nombre).join(' y ')}).`,
    });
  }
  return avisos;
}

// ---------- Estados ----------

/** Desde qué estados se puede hacer cada acción. */
const DESDE: Record<AccionTurno, EstadoTurno[]> = {
  pendiente: ['solicitado'],
  confirmar: ['solicitado', 'pendiente'],
  reprogramar: ['solicitado', 'pendiente', 'confirmado'],
  editar: ['solicitado', 'pendiente', 'confirmado'],
  cancelar: ['solicitado', 'pendiente', 'confirmado'],
  realizado: ['confirmado'],
  ausente: ['confirmado'],
  en_camino: ['confirmado'],
};

export const accionPermitida = (estado: EstadoTurno, accion: AccionTurno) => DESDE[accion].includes(estado);

/** Estado después de la acción. */
export function estadoDespues(estado: EstadoTurno, accion: AccionTurno): EstadoTurno {
  switch (accion) {
    case 'pendiente': return 'pendiente';
    case 'confirmar': return 'confirmado';
    case 'cancelar': return 'cancelado';
    case 'realizado': return 'realizado';
    case 'ausente': return 'ausente';
    default: return estado;
  }
}

/** Acciones que se ofrecen para un turno en ese estado (en orden de uso). */
export const accionesDe = (estado: EstadoTurno): AccionTurno[] =>
  (['confirmar', 'pendiente', 'en_camino', 'realizado', 'reprogramar', 'editar', 'ausente', 'cancelar'] as AccionTurno[])
    .filter((a) => accionPermitida(estado, a));
