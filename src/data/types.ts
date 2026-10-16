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
}

// ---------- Familias y adultos ----------

export interface Family extends Base {
  name: string; // "Familia Ruiz Ferreyra"
}

/** Adulto responsable. También es el usuario que entra al portal (enlace mágico por email). */
export interface Guardian extends Base {
  familyId?: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string; // WhatsApp
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
  /** 22 a 44 semanas. Vacío = de término. */
  gestationalWeeks?: number;
  gestationalDays?: number;
  scope: Scope;
  status: 'activo' | 'inactivo';
  /** Si el sexo es X: qué referencia de crecimiento usar. */
  growthReferenceSex?: 'M' | 'F';
}

// ---------- Membresía ----------

export type Plan = 'anual' | 'semestral';

export interface Membership extends Base {
  familyId: ID;
  plan: Plan;
  status: 'activa' | 'vencida' | 'cancelada';
  startDate: ISODate;
  renewalDate: ISODate;
  patientIds: ID[];
}

export type Currency = 'ARS' | 'USD';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'mercadopago';

export interface Payment extends Base {
  membershipId: ID;
  date: ISODate;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
}

// ---------- Historia clínica ----------

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
  /** 'programada' = turno cargado (aparece en "Hoy"); 'realizada' = ya se atendió. */
  status: 'programada' | 'realizada';
  /** Domicilio al que va la visita (de alguno de los adultos). */
  addressId?: ID;
  /** Referencia opcional a la reserva de Cal.com. */
  calBookingId?: string;
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

export type CarePlanCategory = 'control' | 'prevencion' | 'vacuna' | 'otro';

export interface CarePlanItem extends Base {
  patientId: ID;
  category: CarePlanCategory;
  description: string;
  targetDate?: ISODate;
  done: boolean;
  doneAt?: ISODateTime;
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
  /** No entra a la historia clínica hasta que el médico lo marca revisado. */
  reviewedAt?: ISODateTime;
  reviewedBy?: ID;
  consultationId?: ID;
}

// ---------- Certificados y documentos ----------

export type CertificateType = 'aptitud-fisica' | 'control-salud' | 'buena-salud' | 'libre';

export interface Certificate extends Base {
  patientId: ID;
  type: CertificateType;
  body: string; // "Certifico que [nombre], de [edad], …"
  place: string;
  date: ISODate;
}

export interface Document extends Base {
  patientId: ID;
  title: string;
  date: ISODate;
  file: string; // ruta en el almacenamiento de archivos
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
  problems: ClinicalProblem[];
  allergies: Allergy[];
  consultations: Consultation[];
  measurements: GrowthMeasurement[];
  milestoneChecks: MilestoneCheck[];
  notes: ClinicalNote[];
  followUps: FollowUp[];
  carePlan: CarePlanItem[];
  fever: FeverEntry[];
  certificates: Certificate[];
  documents: Document[];
  auditLog: AuditLog[];
}
