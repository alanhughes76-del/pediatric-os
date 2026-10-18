/**
 * Modelo de datos (segunda versión, reemplaza al orientativo).
 *
 * Pensado para pasar tal cual a Vibecode Cloud en la etapa del backend:
 * - Cada interfaz es una tabla. Los campos `...Id` son claves foráneas.
 * - Fechas en ISO 8601: `...Date` = solo día (AAAA-MM-DD); `...At` = fecha y hora con zona.
 * - Los archivos (PDF) viven en el almacenamiento de archivos; acá se guarda solo la ruta.
 *
 * Reglas:
 * - Nada clínico se borra físicamente: se archiva (`archivedAt`).
 * - Las notas clínicas aprobadas son inmutables: una corrección es una versión nueva.
 * - AuditLog solo suma filas; nunca se edita ni se borra.
 * - Lo que ve la familia se filtra en `selectores.ts`; en el backend tiene que
 *   replicarse como reglas de acceso del servidor.
 */

import type { AccionTurno, Bloqueo, ConfigAgenda, EstadoTurno, OrigenTurno, TipoTurno } from '@shared/agenda';

export type ID = string;
export type ISODate = string; // '2026-10-16'
export type ISODateTime = string; // '2026-10-16T14:30:00-03:00'

/** Campos comunes. `createdBy` es el id de un usuario (el médico o un Guardian). */
export interface Base {
  id: ID;
  createdAt: ISODateTime;
  createdBy: ID;
  /** Archivado en lugar de borrado. */
  archivedAt?: ISODateTime;
}

/** El médico (único usuario con rol médico). */
export interface Doctor {
  id: ID;
  name: string;
  email: string;
  signature: string; // "Dr. Alan Hughes · Médico Pediatra · MN 111.725 · MP 448.970"
  /** Matrículas (Configuración). */
  mn?: string;
  mp?: string;
}

// ---------- Familias y adultos ----------

export interface Family extends Base {
  name: string; // "Familia Ruiz Ferreyra"
  /** Zona de cobertura ("CABA", "GBA Zona Norte"…). */
  zone?: string;
  status?: 'activa' | 'inactiva';
}

/** Sin WhatsApp: el contacto con el Dr. es por PacienteX (pedido del Dr., 17/10/2026). */
export type ContactPreference = 'llamada' | 'email';

/** Adulto responsable. También es el usuario que entra al portal (enlace mágico por email). */
export interface Guardian extends Base {
  familyId?: ID;
  firstName: string;
  lastName: string;
  email: string;
  /** Teléfono en formato E.164 (+549…). */
  phone?: string;
  contactPreference?: ContactPreference;
  /** Solo el médico lo habilita o deshabilita. Nadie se registra solo. */
  accessEnabled: boolean;
}

export type RelationshipType = 'madre' | 'padre' | 'otro';

export interface PatientRelationship extends Base {
  patientId: ID;
  guardianId: ID;
  type: RelationshipType;
  typeDetail?: string; // si type = 'otro' ("abuela", "tutora legal"...)
  isPrimary: boolean; // contacto principal
  validFrom: ISODate;
  validTo?: ISODate;
}

/** Domicilio de un adulto. Los adultos pueden vivir en domicilios distintos. */
export interface Address extends Base {
  guardianId: ID;
  street: string;
  locality: string;
  notes?: string; // timbre, piso, referencias
}

// ---------- Pacientes ----------

export type Sex = 'M' | 'F' | 'X';
export type Scope = 'membresia' | 'cardales' | 'hepta' | 'esporadico' | 'sin-asignar';

export interface Patient extends Base {
  familyId?: ID;
  firstName: string;
  lastName: string;
  birthDate: ISODate; // obligatoria
  sex: Sex;
  /** Opcional. Si está cargado, aparece en los certificados. */
  dni?: string;
  /** 22 a 44 semanas. Vacío = de término. */
  gestationalWeeks?: number;
  gestationalDays?: number;
  scope: Scope;
  status: 'activo' | 'inactivo';
  /** Si el sexo es X: qué referencia de crecimiento usar. */
  growthReferenceSex?: 'M' | 'F';
  coverage?: Coverage;
  bloodType?: BloodType;
}

export type CoverageKind = 'prepaga' | 'obra-social' | 'particular';
export interface Coverage {
  kind: CoverageKind;
  /** "OSDE 210", "IOMA"… */
  name?: string;
  memberNumber?: string;
}

export type BloodType = '0+' | '0-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
export const GRUPOS_SANGUINEOS: BloodType[] = ['0+', '0-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

// ---------- Membresía ----------

export type Plan = 'anual' | 'semestral';

/**
 * Estado que carga el Dr. "Por vencer" y "vencida" se calculan con la fecha de renovación
 * (`membresiaDeFamilia`); "vencida" guardado queda por los datos viejos.
 */
export type EstadoMembresiaGuardado = 'activa' | 'suspendida' | 'cancelada' | 'vencida';

export interface Membership extends Base {
  familyId: ID;
  plan: Plan;
  status: EstadoMembresiaGuardado;
  startDate: ISODate;
  renewalDate: ISODate;
  patientIds: ID[];
  /** Observaciones del Dr. (la familia no las ve). */
  notes?: string;
  updatedAt?: ISODateTime;
  updatedBy?: ID;
}

export type Currency = 'ARS' | 'USD';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'mercadopago';
/** "A confirmar": lo cargó una automatización (por ejemplo, el bot de Telegram, Etapa 8) y falta que el Dr. lo confirme. */
export type EstadoPago = 'confirmado' | 'a_confirmar';

export interface Payment extends Base {
  /** La membresía que paga, si es un pago de membresía. */
  membershipId?: ID;
  /** La familia (los pagos viejos solo tienen la membresía). */
  familyId?: ID;
  date: ISODate;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  /** Concepto: "Membresía anual", "Visita del 12/10"… */
  concept?: string;
  /** Sin estado = confirmado (datos viejos). */
  status?: EstadoPago;
  updatedAt?: ISODateTime;
  updatedBy?: ID;
}

// ---------- IA Asistente (Etapa 9) ----------

export type AccionIA = 'resumir_historia' | 'preparar_evolucion' | 'sugerir_material' | 'revisar_estudios' | 'consulta_libre';

/** Un uso de la IA: qué acción, de qué paciente, cuándo, qué propuso y si el Dr. la aceptó. */
export interface InteraccionIA {
  id: ID;
  action: AccionIA;
  patientId: ID;
  consultationId?: ID | null;
  createdAt: ISODateTime;
  model?: string;
  status: 'ok' | 'rechazo' | 'incompleta' | 'error';
  resultado?: Record<string, unknown> | null;
  aceptado: boolean | null;
  decididoAt?: ISODateTime | null;
}

// ---------- Lo que entra desde Make (Etapa 8b) ----------

/** Alguien que escribió por la web o completó la admisión y todavía no es una familia cargada. */
export interface Interesado extends Base {
  origen: 'web' | 'tally';
  nombre: string;
  email: string;
  telefono: string | null;
  zona?: string | null;
  estado: 'nuevo' | 'contactado' | 'familia' | 'archivado';
  familyId?: ID;
  recibidoAt: ISODateTime;
}

export interface RespuestaFormulario { pregunta: string; respuesta: string }

/** Mensaje y respuestas de un formulario (solo el médico). */
export interface Admision extends Base {
  origen: 'web' | 'tally';
  interesadoId?: ID;
  familyId?: ID | null;
  mensaje: string;
  respuestas: RespuestaFormulario[];
  recibidaAt: ISODateTime;
}

/** Triage de urgencia (Tally): se adjunta a la solicitud de urgencia; solo el médico. */
export interface Triage extends Base {
  appointmentId: ID | null;
  familyId: ID | null;
  contacto: { nombre: string; email: string; telefono: string | null };
  respuestas: RespuestaFormulario[];
  recibidoAt: ISODateTime;
  revisadoAt: ISODateTime | null;
}

/** Transcripción de Plaud: borrador que el Dr. pasa a una consulta. Nada se aprueba solo. */
export interface Transcripcion extends Base {
  texto: string;
  grabadaAt: ISODateTime;
  recibidaAt: ISODateTime;
  fechasNacimiento: ISODate[];
  pacientesSugeridos: ID[];
  medidas: { weightKg?: number; heightCm?: number; headCm?: number };
  estado: 'pendiente' | 'usada' | 'descartada';
  patientId?: ID;
  consultationId?: ID;
  /** Si el Dr. usó las medidas propuestas (true), las descartó (false) o todavía no decidió. */
  medidasUsadas?: boolean;
}

// ---------- Automatizaciones (Etapa 8) ----------

/** Un evento de la outbox, tal como lo ve el Dr. en Configuración (sin abrir los datos). */
export interface EventoOutbox {
  id: ID;
  type: string;
  status: 'pendiente' | 'reintentar' | 'enviado' | 'fallido' | 'sin_destino' | 'apagado';
  createdAt: ISODateTime;
  attempts?: number;
  lastError?: string | null;
}

// ---------- Configuración (Etapa 7) ----------

/** Links que usa la app (settings/links). La familia también los lee (PacienteX y Cal.com). */
export interface Links {
  pacienteXUrl: string;
  calControlUrl: string;
  calUrgenciaUrl: string;
  /** Plataforma de recetas registrada en ReNaPDiS: la app no emite recetas, abre esta plataforma. */
  recetasNombre: string;
  recetasUrl: string;
}

/** Texto y destino prearmados de cada tipo de certificado (settings/certificados). "{apto}" = apto/apta. */
export type PlantillasCertificado = Partial<Record<Exclude<CertificateType, 'libre'>, { texto: string; destino: string }>>;

/** Precios y condiciones (settings/precios). Los carga el Dr.; no van en el código. */
export interface Precios {
  membresia: {
    /** Precio por familia, en la moneda indicada. */
    anual: number;
    semestral: number;
    moneda: Currency;
    /** Descuento por cada hijo adicional, en %, para el plan anual. */
    descuentoHijoAdicionalPct: number;
    /** Cómo se convierte si se paga en pesos (texto, lo escribe el Dr.). */
    conversion: string;
  };
  /** Visitas sueltas, en pesos. */
  visitas: {
    controlOUrgenciaDia: number;
    hermanoMismaVisita: number;
    urgenciaNocheFinDeSemanaFeriado: number;
    prenatalVideollamada: number;
    prenatalDomicilio: number;
  };
  /** El prenatal se descuenta de la membresía si la familia se suma dentro de estos días del nacimiento. */
  prenatalDescuentaDias: number;
}

// ---------- Historia clínica ----------

/** Resumen clínico (antecedentes): uno por paciente. Solo lo ve el médico. */
export interface ClinicalBackground extends Base {
  patientId: ID;
  /** Perinatales (la edad gestacional está en el paciente). */
  birthWeightG?: number;
  deliveryType?: 'vaginal' | 'cesarea' | 'no-sabe';
  perinatalNotes?: string;
  /** Patológicos e internaciones. */
  pathological?: string;
  /** Familiares relevantes. */
  family?: string;
  habits?: string;
  currentMedication?: string;
  updatedAt?: ISODateTime;
}

export interface ClinicalProblem extends Base {
  patientId: ID;
  description: string;
  status: 'activo' | 'resuelto';
  since?: ISODate;
  /** Fecha de resolución (si está resuelto). */
  resolvedDate?: ISODate;
  /** Apagado por defecto. El médico lo prende después de hablarlo con la familia. */
  visibleToFamily: boolean;
}

export interface Allergy extends Base {
  patientId: ID;
  allergen: string;
  reaction?: string;
  severity: 'leve' | 'moderada' | 'grave';
  /** La familia ve siempre las confirmadas y nunca las referidas. */
  status: 'referida' | 'confirmada';
}

export type Modality = 'domicilio' | 'telemedicina' | 'otro';
export type VisitType = 'control' | 'urgencia-dia' | 'urgencia-noche' | 'seguimiento' | 'rn';

export interface Consultation extends Base {
  patientId: ID;
  occurredAt: ISODateTime;
  modality: Modality;
  visitType: VisitType;
  /** Desde la Etapa 3 los turnos están en `appointments`: una consulta es siempre una visita hecha. */
  status: 'realizada';
  /** Turno de origen (opcional). */
  appointmentId?: ID;
  /** Problemas de salud que se abordaron en la consulta. */
  problemIds?: ID[];
  /** Domicilio al que va la visita (de alguno de los adultos). */
  addressId?: ID;
  /** Texto original de la consulta (escrito, pegado o dictado). Se guarda solo. */
  rawText: string;
}

export interface GrowthMeasurement extends Base {
  patientId: ID;
  consultationId?: ID;
  measuredAt: ISODate;
  weightKg?: number;
  heightCm?: number;
  headCm?: number;
  /** Posición en que se midió la talla. Por defecto: acostado antes de los 24 meses, de pie desde los 24. */
  position?: 'acostado' | 'de_pie';
}

/** Un hito marcado (o desmarcado) en una consulta. */
export interface MilestoneCheck extends Base {
  patientId: ID;
  consultationId: ID;
  control: number; // 2, 4, 6... 60 (meses)
  itemId: string; // `${control}:${area}:${índice}` o `prunape:${grupo}:${índice}`
  achieved: boolean;
  updatedAt: ISODateTime;
}

export type NoteStatus = 'borrador' | 'aprobada' | 'reemplazada';

export interface ClinicalNote extends Base {
  consultationId: ID;
  patientId: ID;
  version: number;
  previousVersionId?: ID;
  status: NoteStatus;
  findings: string; // Hallazgos clínicos
  plan: string; // Conducta e indicaciones
  familySummary: string; // Resumen para la familia: lo que la familia ve, tal cual
  allergiesMedication: string; // Alergias y medicación
  clinicalFlag: boolean; // Bandera clínica
  origin: 'humano' | 'ia';
  updatedAt: ISODateTime;
  approvedBy?: ID;
  approvedAt?: ISODateTime;
}

/** Seguimiento pendiente: nace al aprobar una nota con bandera clínica. */
export interface FollowUp extends Base {
  noteId: ID;
  consultationId: ID;
  patientId: ID;
  dueAt: ISODateTime;
  message: string; // borrador editable para la familia
  status: 'pendiente' | 'resuelto';
  resolvedAt?: ISODateTime;
}

export type CarePlanCategory = 'control' | 'prevencion' | 'vacuna' | 'estudio' | 'otro';

export interface CarePlanItem extends Base {
  patientId: ID;
  category: CarePlanCategory;
  description: string;
  targetDate?: ISODate;
  done: boolean;
  doneAt?: ISODateTime;
  /** Cancelado: deja de estar pendiente y no se borra. */
  cancelledAt?: ISODateTime;
}

// ---------- Vacunas, medicación y estudios (Etapa 5) ----------

/** Una dosis del esquema del paciente (del calendario) o una vacuna cargada a mano. */
export interface VaccineDose extends Base {
  patientId: ID;
  vaccine: string;
  dose: string;
  /** Del calendario: edad como se muestra y en meses; fecha estimada. */
  ageText?: string;
  ageMonths?: number;
  dueDate?: ISODate;
  /** "Atrasada" no se guarda: es una pendiente con la fecha estimada ya pasada. */
  status: 'pendiente' | 'aplicada';
  appliedDate?: ISODate;
  place?: string;
  lot?: string;
  source: 'calendario' | 'manual';
  updatedAt?: ISODateTime;
}

/** Medicación actual. La dosis la escribe el médico: la plataforma nunca sugiere ni calcula dosis. */
export interface Medication extends Base {
  patientId: ID;
  drug: string;
  presentation?: string;
  dose: string;
  frequency?: string;
  startDate: ISODate;
  endDate?: ISODate;
  indication?: string;
  consultationId?: ID;
  updatedAt?: ISODateTime;
}

/** Registro de lo indicado. La receta legal se emite en la plataforma registrada (ReNaPDiS). */
export interface PrescriptionRecord extends Base {
  patientId: ID;
  date: ISODate;
  /** Lo indicado, tal como lo escribe el médico. */
  detail: string;
  consultationId?: ID;
  /** Se marca cuando la receta ya se emitió en la plataforma. */
  issuedAt?: ISODateTime;
}

export type StudyStatus = 'solicitado' | 'realizado' | 'resultado' | 'revisado';

export interface StudyOrder extends Base {
  patientId: ID;
  study: string;
  reason?: string;
  orderedDate: ISODate;
  /** "Revisar resultado el": fecha que estima el médico. */
  reviewDate?: ISODate;
  status: StudyStatus;
  /** Lo que dice el resultado, en palabras del médico (el archivo va como documento con studyId). */
  resultNote?: string;
  resultAt?: ISODateTime;
  reviewedAt?: ISODateTime;
  consultationId?: ID;
  updatedAt?: ISODateTime;
}

// ---------- Registro de fiebre ----------

export type FeverSite = 'axilar' | 'rectal' | 'oral' | 'oido' | 'frente';
export type ChildState = 'animado' | 'decaido' | 'muy-decaido';
export type Improvement = 'no' | 'un-poco' | 'bien';
export type Antipyretic = 'paracetamol' | 'ibuprofeno' | 'otro';
/** Paracetamol: gotas o jarabe. Ibuprofeno: al 2 % o al 4 %. */
export type AntipyreticForm = 'gotas' | 'jarabe' | '2%' | '4%';

export interface FeverEntry extends Base {
  patientId: ID;
  kind: 'toma' | 'antitermico';
  at: ISODateTime;
  // Toma de temperatura
  temperatureC?: number;
  site?: FeverSite;
  state?: ChildState;
  /** Solo si hubo un antitérmico anotado en las 6 horas previas. */
  improvement?: Improvement;
  note?: string;
  // Antitérmico
  drug?: Antipyretic;
  drugForm?: AntipyreticForm;
  /** Nombre que escribe la familia si eligió "Otro". */
  drugName?: string;
  /** Texto libre: la dosis que indicó el pediatra. La app nunca sugiere dosis. */
  dose?: string;
  /** Lo cargó el médico (por ejemplo, lo que le dijeron por teléfono). */
  enteredByDoctor?: boolean;
  /** Quién lo anotó, según la sesión (Firebase). */
  origin?: 'medico' | 'familia';
  /** No entra a la historia clínica hasta que el médico lo marca revisado. */
  reviewedAt?: ISODateTime;
  reviewedBy?: ID;
  consultationId?: ID;
}

// ---------- Certificados y documentos ----------

export type CertificateType = 'aptitud-fisica' | 'control-salud' | 'buena-salud' | 'constancia-atencion' | 'libre';

/**
 * Certificado emitido. Es inmutable: si hay un error se anula (queda visible como
 * "Anulado", con motivo) y se emite otro.
 */
export interface Certificate extends Base {
  patientId: ID;
  type: CertificateType;
  /** Texto completo tal como se emitió: "Certifico que …". */
  body: string;
  /** Adulto a pedido de quien se extiende. */
  requestedBy: string;
  /** Ante quién se presenta ("el colegio", "la prepaga"…). */
  destination: string;
  place: string;
  date: ISODate;
  /** Firma tipográfica (la firma digital real llega en otra etapa). */
  signature: string;
  status: 'emitido' | 'anulado';
  voidReason?: string;
  voidedAt?: ISODateTime;
  /** Documento del paciente donde queda guardado el PDF. */
  documentId: ID;
}

export type DocumentKind = 'certificado' | 'receta' | 'estudio' | 'otro';

export interface Document extends Base {
  patientId: ID;
  title: string;
  date: ISODate;
  /** Ruta en Cloud Storage (nunca un enlace público). Vacía en los ejemplos sin archivo. */
  file: string;
  /** Si el documento es un certificado emitido desde la app. */
  certificateId?: ID;
  /** Tipo de documento (los certificados viejos no lo tienen: se deduce de certificateId). */
  kind?: DocumentKind;
  /** Quién lo cargó: el médico, la familia (Etapa 6) o el sistema (el PDF del certificado). */
  origin?: 'medico' | 'familia' | 'sistema';
  /** La familia lo ve en el portal. */
  visibleToFamily?: boolean;
  mimeType?: string;
  studyId?: ID;
  prescriptionId?: ID;
}

// ---------- Prevención y educación (Etapa 5b) ----------

/** Material que carga el Dr. (PDF o enlace), etiquetado por edad y tema. */
export interface EducationalMaterial extends Base {
  title: string;
  kind: 'pdf' | 'enlace';
  /** Enlace (si es enlace) o ruta en Storage (si es PDF). */
  url?: string;
  file?: string;
  /** Edad para la que sirve, en meses (vacío = cualquier edad). */
  ageFromMonths?: number;
  ageToMonths?: number;
  topics: string[];
  updatedAt?: ISODateTime;
}

/** Material enviado a una familia (lo registra el servidor y emite el aviso para Make). */
export interface MaterialDelivery extends Base {
  patientId: ID;
  materialId: ID;
  sentAt: ISODateTime;
}

// ---------- Agenda (Etapa 3) ----------

/**
 * Turno. Se separa de la consulta: el turno organiza la visita, la consulta es lo clínico.
 * En Firebase lo escribe solo el servidor (superposición en transacción).
 */
export interface Appointment extends Base {
  start: ISODateTime;
  /** Día de inicio en Argentina (AAAA-MM-DD). */
  day: ISODate;
  durationMin: number;
  type: TipoTurno;
  modality: Modality;
  /** Familia (null mientras está "por identificar"). Un turno prenatal va solo con la familia. */
  familyId: ID | null;
  /** Hermanos en la misma visita. */
  patientIds: ID[];
  /** Copia de la dirección de la visita: cambiarla no toca la dirección guardada. */
  address: { text: string; locality: string; addressId?: ID } | null;
  zone: string | null;
  /** Motivo general, solo lo necesario para organizar la visita. */
  reason: string;
  /** Notas operativas: solo el médico y el asistente. */
  opsNotes: string;
  status: EstadoTurno;
  origin: OrigenTurno;
  cancelReason?: string;
  onTheWayAt?: ISODateTime;
  calBookingUid?: string;
  /** Contacto de quien pidió el turno, mientras no se sabe qué familia es. */
  porIdentificar?: { name: string; email: string; phone: string; dni: string };
  updatedBy?: ID;
  updatedAt?: ISODateTime;
}

/** Historial de un turno: cada cambio de estado o de horario, con antes y después. */
export interface AppointmentChange {
  id: ID;
  appointmentId: ID;
  at: ISODateTime;
  atMs: number;
  actorId: ID;
  action: AccionTurno | 'crear' | 'solicitud';
  before: { status: EstadoTurno; start: ISODateTime; durationMin: number } | null;
  after: { status: EstadoTurno; start: ISODateTime; durationMin: number } | null;
  reason?: string;
}

/** Período bloqueado en la agenda. */
export interface AgendaBlock extends Base, Bloqueo {}

// ---------- Comunicaciones ----------

/**
 * Registro de algo que salió hacia la familia (por ahora, el resumen aprobado que manda Make).
 * No guarda el texto: lo lee también el asistente.
 */
/**
 * Registro de comunicaciones (prompt maestro 7.14). No es un chat: las conversaciones van por PacienteX.
 * Lo que sale por las automatizaciones, lo que entra por los canales conectados (Etapa 8) y lo que el Dr.
 * registra a mano. El asunto es breve y sin datos clínicos (lo clínico va en la historia).
 */
export type CanalComunicacion = 'email' | 'pacientex' | 'telefono' | 'presencial' | 'telegram' | 'otro';
export type DireccionComunicacion = 'saliente' | 'entrante';
export type ClaseComunicacion = 'administrativo' | 'clinico' | 'urgente';
/** "Enviado a Make" hasta que Make informe la entrega (Etapa 8). Lo manual queda "registrado". */
export type EstadoComunicacion = 'registrado' | 'enviado_a_make' | 'entregado' | 'fallido';

export interface Communication extends Base {
  patientId?: ID;
  familyId?: ID;
  noteId?: ID;
  kind: 'resumen_familia' | 'recordatorio' | 'aviso' | 'manual' | 'consulta_web' | 'encuesta' | 'mensaje';
  channel: CanalComunicacion;
  /** Sin dato = saliente (los registros viejos). */
  direction?: DireccionComunicacion;
  /** Sin dato: el resumen es clínico; lo demás, administrativo. */
  classification?: ClaseComunicacion;
  /** Cuándo fue (sin dato = cuando se registró). */
  at?: ISODateTime;
  subject?: string;
  status: EstadoComunicacion;
  recipientIds?: ID[];
}

// ---------- Avisos de la campana (Etapa 6) ----------

/** Aviso para el Dr. que genera el servidor (por ejemplo, una familia cambió su contacto). */
export interface AppNotification {
  id: ID;
  recipientUid: ID;
  /** datos_familia: una familia cambió su contacto. Las demás llegan desde Make (Etapa 8b). */
  kind: 'datos_familia' | 'interesado' | 'triage' | 'plaud' | 'pago';
  /** A dónde lleva el aviso (los que llegan desde Make). */
  href?: string;
  guardianId?: ID;
  /** Qué cambió (nunca los datos). */
  campos?: string[];
  titulo?: string;
  createdAt: ISODateTime;
  readAt?: ISODateTime | null;
}

// ---------- Auditoría ----------

/** Solo suma filas. Incluye los ingresos al portal (Registro de accesos). */
export interface AuditLog {
  id: ID;
  at: ISODateTime;
  actorId: ID;
  action: string; // 'login', 'nota.aprobar', 'fiebre.revisar', ...
  entity?: string;
  entityId?: ID;
  detail?: string;
}

/** Todo el contenido de la base, en memoria durante esta etapa. */
export interface Database {
  doctor: Doctor;
  families: Family[];
  guardians: Guardian[];
  relationships: PatientRelationship[];
  addresses: Address[];
  patients: Patient[];
  memberships: Membership[];
  payments: Payment[];
  backgrounds: ClinicalBackground[];
  problems: ClinicalProblem[];
  allergies: Allergy[];
  consultations: Consultation[];
  measurements: GrowthMeasurement[];
  milestoneChecks: MilestoneCheck[];
  notes: ClinicalNote[];
  followUps: FollowUp[];
  carePlan: CarePlanItem[];
  vaccineDoses: VaccineDose[];
  medications: Medication[];
  prescriptions: PrescriptionRecord[];
  studies: StudyOrder[];
  fever: FeverEntry[];
  certificates: Certificate[];
  documents: Document[];
  appointments: Appointment[];
  appointmentHistory: AppointmentChange[];
  blocks: AgendaBlock[];
  communications: Communication[];
  educationalMaterials: EducationalMaterial[];
  materialDeliveries: MaterialDelivery[];
  notifications: AppNotification[];
  /** Horarios, duraciones, buffer y zonas (en Firebase: settings/agenda). */
  agenda: ConfigAgenda;
  /** IA encendida o apagada (settings/ia). Arranca apagada; el Dr. la enciende después de revisar el consentimiento. */
  ia: { enabled: boolean; consentimientoRevisadoAt?: ISODateTime };
  /** Usos de la IA Asistente (solo el médico). */
  aiInteractions: InteraccionIA[];
  /** settings/vacunas: el calendario es un borrador hasta que el Dr. lo verifique. */
  vacunas: { calendarioVerificado: boolean };
  /** settings/links. */
  links: Links;
  /** settings/precios. */
  precios: Precios;
  /** settings/ambitos: el nombre que el Dr. le da a cada ámbito. */
  ambitos: Record<Scope, string>;
  /** settings/certificados: lo que el Dr. cambió de los textos prearmados. */
  plantillas: PlantillasCertificado;
  /** settings/automatizaciones: eventos que el Dr. apagó. */
  automatizaciones: { apagados: string[] };
  /** Los últimos eventos para Make (solo el médico; en la demostración, vacío). */
  outbox: EventoOutbox[];
  /** Lo que entra desde Make (Etapa 8b). */
  interesados: Interesado[];
  admisiones: Admision[];
  triage: Triage[];
  transcripciones: Transcripcion[];
  auditLog: AuditLog[];
}
