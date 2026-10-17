/**
 * Lo que la app pide a la capa de datos, sea la demostración en memoria o Firebase.
 * Las pantallas solo usan `useApp()` (store.tsx): no saben de dónde vienen los datos.
 */
import type { AuditLog, Certificate, ClinicalNote, Consultation, Database, Guardian, Patient } from './types';
import type { ResultadoEnlace } from '@/lib/enlaceMagico';
import type { Fuente } from './fuente';

export type Sesion =
  | { rol: 'medico'; usuarioId: string }
  | { rol: 'familia'; usuarioId: string; guardian: Guardian };

/** Tablas que guardan filas con `id` (todas menos `doctor` y la auditoría). */
export type Tabla = Exclude<keyof Database, 'doctor' | 'auditLog'>;
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
  /** Demostración: enlace mágico simulado; devuelve el token si el email es de un adulto habilitado. */
  pedirEnlaceEmail: (email: string) => string | null;
  entrarConEnlace: (token: string) => ResultadoEnlace;
  salir: () => void;

  // Escrituras (cada una queda en la auditoría)
  /** Agrega una fila (completa `createdAt` y `createdBy`). Devuelve el id. */
  agregar: <T extends Tabla>(tabla: T, fila: Omit<Fila<T>, 'id' | 'createdAt' | 'createdBy'> & { id?: string }, accion?: string) => string;
  /** Cambia campos de una fila existente. */
  actualizar: <T extends Tabla>(tabla: T, id: string, cambios: Partial<Fila<T>>, accion?: string) => void;
  /** Varias escrituras juntas (por ejemplo, un adulto con su domicilio y su vínculo). */
  enLote: (fn: (db: Database, ctx: { ahora: string; usuarioId: string; log: (a: Omit<AuditLog, 'id' | 'at' | 'actorId'>) => void }) => Database) => void;
  operaciones: Operaciones;
}
