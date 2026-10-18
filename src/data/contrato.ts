/**
 * Lo que la app pide a la capa de datos, sea la demostración en memoria o Firebase.
 * Las pantallas solo usan `useApp()` (store.tsx): no saben de dónde vienen los datos.
 */
import type { Appointment, AuditLog, Certificate, Communication, ClinicalNote, Consultation, Database, Doctor, Document, DocumentKind, EducationalMaterial, Guardian, Links, Patient, PlantillasCertificado, Precios, Scope } from './types';
import type { ArchivoElegido } from '@/lib/archivos';
import type { AccionTurno, Aviso, ConfigAgenda } from '@shared/agenda';
import type { Fuente } from './fuente';

export type Sesion =
  | { rol: 'medico'; usuarioId: string }
  | { rol: 'familia'; usuarioId: string; guardian: Guardian };

/**
 * Tablas que la app escribe fila por fila (todas menos `doctor`, la configuración de la agenda,
 * la auditoría y los turnos con su historial, que pasan por `operaciones`).
 */
export type Tabla = Exclude<keyof Database, 'doctor' | 'agenda' | 'ia' | 'vacunas' | 'links' | 'precios' | 'ambitos' | 'plantillas' | 'auditLog' | 'communications' | 'materialDeliveries' | 'notifications' | 'appointments' | 'appointmentHistory'>;
export type Fila<T extends Tabla> = Database[T][number];

export interface CamposNota {
  findings: string;
  plan: string;
  familySummary: string;
  allergiesMedication: string;
  clinicalFlag: boolean;
}

export type ResultadoAlta =
  | { estado: 'creado'; id: string }
  | { estado: 'posible-duplicado' }
  | { estado: 'error'; mensaje: string };

export type DatosPacienteNuevo = Omit<Patient, 'id' | 'createdAt' | 'createdBy'>;
export type DatosCertificado = Pick<Certificate, 'patientId' | 'type' | 'body' | 'requestedBy' | 'destination' | 'place' | 'date'> & { titulo: string };

/** Datos de un turno nuevo o editado (lo que manda la pantalla). */
export type DatosTurno = Pick<Appointment, 'type' | 'modality' | 'familyId' | 'patientIds' | 'address' | 'reason' | 'opsNotes'>
  & { start: string; durationMin: number };

/**
 * Resultado de crear o cambiar un turno:
 * - 'avisos': hay avisos que no bloquean (fuera de horario, zona…) y no se guardó; se reenvía con `aceptarAvisos`.
 * - 'error': no se pudo (por ejemplo, se superpone con un turno confirmado).
 */
export type ResultadoTurno =
  | { estado: 'guardado'; id: string }
  | { estado: 'avisos'; avisos: Aviso[] }
  | { estado: 'error'; mensaje: string };

export interface PedidoAccionTurno {
  turno: Appointment;
  accion: AccionTurno;
  start?: string;
  durationMin?: number;
  motivo?: string;
  cambios?: Partial<DatosTurno>;
  aceptarAvisos?: boolean;
}

/**
 * Acciones que en Firebase hace solo el servidor (validaciones críticas, prompt maestro 3.2).
 * Devuelven un mensaje de error comprensible, o null si salió bien.
 */
export interface Operaciones {
  crearPaciente: (datos: DatosPacienteNuevo, confirmarPosibleDuplicado: boolean) => Promise<ResultadoAlta>;
  aprobarNota: (p: { nota: ClinicalNote; consulta: Consultation; campos: CamposNota; origen: ClinicalNote['origin'] }) => Promise<string | null>;
  corregirNota: (nota: ClinicalNote) => Promise<string | null>;
  emitirCertificado: (datos: DatosCertificado) => Promise<string | null>;
  anularCertificado: (c: Certificate, motivo: string) => Promise<string | null>;
  crearTurno: (datos: DatosTurno & { confirmar: boolean; aceptarAvisos?: boolean }) => Promise<ResultadoTurno>;
  accionTurno: (pedido: PedidoAccionTurno) => Promise<ResultadoTurno>;
  /** "Revisé y lo mando": el resumen de una nota aprobada sale hacia Make. */
  enviarResumen: (p: { nota: ClinicalNote; asunto: string; texto: string }) => Promise<string | null>;
  /** "Enviar material": queda disponible en el portal y sale el aviso para Make. */
  enviarMaterial: (p: { material: EducationalMaterial; patientId: string }) => Promise<string | null>;
  /** Familia: pide una visita (queda como solicitud; la confirma el Dr.). */
  pedirVisita: (p: PedidoVisita) => Promise<string | null>;
  /** Familia: actualiza su contacto. Al Dr. le llega un aviso. */
  actualizarMisDatos: (p: { phone?: string; email?: string; contactPreference?: Guardian['contactPreference'] }) => Promise<string | null>;
  /** Familia: agrega o corrige una de sus direcciones. Al Dr. le llega un aviso. */
  guardarDireccion: (p: { id?: string; street: string; locality: string; notes?: string }) => Promise<string | null>;
  /** El Dr. marca un aviso de la campana como visto. */
  marcarAvisoVisto: (id: string) => Promise<void>;
  /** El Dr. marca el calendario de vacunas como verificado (o lo vuelve a borrador). */
  verificarCalendario: (verificado: boolean) => Promise<string | null>;
  /** Registro a mano de una comunicación (una llamada, algo que se habló en persona…). */
  registrarComunicacion: (datos: DatosComunicacion) => Promise<string | null>;
  /** Configuración (solo el médico): agenda, links, precios o sus datos profesionales. */
  guardarAjustes: (p: Ajuste) => Promise<string | null>;
}

export type DatosComunicacion = Pick<Communication, 'patientId' | 'familyId' | 'channel' | 'direction' | 'classification' | 'at'> & { subject: string };

export type DatosProfesional = Pick<Doctor, 'name' | 'signature' | 'mn' | 'mp'>;
export type Ajuste =
  | { clave: 'agenda'; datos: ConfigAgenda }
  | { clave: 'links'; datos: Links }
  | { clave: 'precios'; datos: Precios }
  | { clave: 'profesional'; datos: DatosProfesional }
  | { clave: 'ambitos'; datos: Record<Scope, string> }
  | { clave: 'certificados'; datos: PlantillasCertificado };

export interface PedidoVisita {
  patientIds: string[];
  tipo: 'control' | 'urgencia';
  /** Control: día ("AAAA-MM-DD") y hora ("HH:MM") que prefieren. La urgencia es para ahora. */
  fecha?: string;
  hora?: string;
  addressId?: string;
  motivo: string;
}

export interface DatosDocumento {
  patientId: string;
  title: string;
  date: string;
  kind: DocumentKind;
  visibleToFamily: boolean;
  studyId?: string;
  prescriptionId?: string;
}

export type DatosMaterial = Pick<EducationalMaterial, 'title' | 'kind' | 'url' | 'ageFromMonths' | 'ageToMonths' | 'topics'>;

/**
 * Archivos: se suben a Cloud Storage con la sesión del médico y se leen con ella.
 * Nunca hay enlaces públicos. Devuelven un mensaje de error comprensible, o null si salió bien.
 */
export interface Archivos {
  subirDocumento: (datos: DatosDocumento, archivo: ArchivoElegido) => Promise<string | null>;
  abrirDocumento: (d: Document) => Promise<string | null>;
  /** PDF (con archivo) o enlace (sin archivo). */
  guardarMaterial: (datos: DatosMaterial, archivo?: ArchivoElegido) => Promise<string | null>;
  abrirMaterial: (m: EducationalMaterial) => Promise<string | null>;
}

export interface AppState {
  fuente: Fuente;
  /** Ya se sabe si hay sesión (en Firebase se resuelve al arrancar). */
  listo: boolean;
  /**
   * Datos que ve la sesión actual. Con sesión de familia (demostración) es la vista filtrada
   * (vistaFamilia): lo oculto no llega a ninguna pantalla de la familia.
   */
  db: Database;
  sesion: Sesion | null;
  /** Id del usuario actual (médico o adulto). */
  usuarioId: string;
  /** Último error al guardar, en palabras comprensibles. */
  error: string | null;
  limpiarError: () => void;

  // Ingreso
  /** Firebase: email y contraseña del equipo. Devuelve un mensaje de error o null. */
  ingresar: (email: string, clave: string) => Promise<string | null>;
  /** Demostración: selector de rol. */
  entrarComoMedico: () => void;
  entrarComoAdulto: (guardianId: string) => void;
  /**
   * Familias: pide el enlace mágico. La respuesta es la misma exista o no el email.
   * `enlaceDePrueba` solo aparece en la demostración y en el emulador (no hay mails de verdad).
   */
  pedirEnlaceEmail: (email: string) => Promise<{ error?: string; enlaceDePrueba?: string }>;
  /** Entra con el código del enlace. Devuelve un mensaje de error, o null si entró. */
  entrarConEnlace: (token: string) => Promise<string | null>;
  salir: () => void;

  // Escrituras (cada una queda en la auditoría)
  /** Agrega una fila (completa `createdAt` y `createdBy`). Devuelve el id. */
  agregar: <T extends Tabla>(tabla: T, fila: Omit<Fila<T>, 'id' | 'createdAt' | 'createdBy'> & { id?: string }, accion?: string) => string;
  /** Cambia campos de una fila existente. */
  actualizar: <T extends Tabla>(tabla: T, id: string, cambios: Partial<Fila<T>>, accion?: string) => void;
  /** Varias escrituras juntas (por ejemplo, un adulto con su domicilio y su vínculo). */
  enLote: (fn: (db: Database, ctx: { ahora: string; usuarioId: string; log: (a: Omit<AuditLog, 'id' | 'at' | 'actorId'>) => void }) => Database) => void;
  operaciones: Operaciones;
  archivos: Archivos;
}
