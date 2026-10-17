/**
 * Lecturas de los módulos clínicos de la barra lateral (Etapa 4): Historia clínica, Consultas y
 * Crecimiento. Juntan lo de todos los pacientes; el detalle sigue en la ficha de cada uno.
 * Solo para el médico. Lógica pura, con tests.
 */
import type { Allergy, ClinicalNote, ClinicalProblem, Consultation, Database, Patient } from './types';
import { notaVigente } from './selectores';
import { coincide } from '@/lib/busqueda';
import { filasDeCrecimiento, type FilaCrecimiento } from '@/lib/crecimiento';

const activo = (x: { archivedAt?: string }) => !x.archivedAt;
const pacienteDe = (db: Database, id: string) => db.patients.find((p) => p.id === id && activo(p));

// ---------- Consultas ----------

export type FiltroConsultas = 'todas' | 'borrador' | 'sin-nota';
export type EstadoNota = 'sin-nota' | 'borrador' | 'aprobada';

export interface FilaConsulta { consulta: Consultation; paciente: Patient; nota?: ClinicalNote; estado: EstadoNota }

export function listaConsultas(db: Database, filtro: FiltroConsultas = 'todas', q = ''): FilaConsulta[] {
  return db.consultations
    .filter(activo)
    .map((c): FilaConsulta | null => {
      const paciente = pacienteDe(db, c.patientId);
      const nota = notaVigente(db, c.id);
      const estado: EstadoNota = !nota ? 'sin-nota' : nota.status === 'aprobada' ? 'aprobada' : 'borrador';
      return paciente ? { consulta: c, paciente, nota, estado } : null;
    })
    .filter((x): x is FilaConsulta => x !== null)
    .filter((x) => filtro === 'todas' || x.estado === filtro)
    .filter((x) => !q.trim() || coincide(x.paciente, q))
    .sort((a, b) => b.consulta.occurredAt.localeCompare(a.consulta.occurredAt));
}

// ---------- Historia clínica ----------

export function problemasActivos(db: Database): { problema: ClinicalProblem; paciente: Patient }[] {
  return db.problems
    .filter((p) => activo(p) && p.status === 'activo')
    .map((problema) => ({ problema, paciente: pacienteDe(db, problema.patientId)! }))
    .filter((x) => x.paciente)
    .sort((a, b) => a.paciente.lastName.localeCompare(b.paciente.lastName) || a.problema.description.localeCompare(b.problema.description));
}

/** Confirmadas primero, después las referidas (para revisarlas). */
export function alergiasCargadas(db: Database): { alergia: Allergy; paciente: Patient }[] {
  return db.allergies
    .filter(activo)
    .map((alergia) => ({ alergia, paciente: pacienteDe(db, alergia.patientId)! }))
    .filter((x) => x.paciente)
    .sort((a, b) => (a.alergia.status === b.alergia.status ? a.paciente.lastName.localeCompare(b.paciente.lastName) : a.alergia.status === 'confirmada' ? -1 : 1));
}

// ---------- Crecimiento ----------

export interface FilaCrecimientoPaciente {
  paciente: Patient;
  ultima?: FilaCrecimiento;
  /** Avisos de la última medición (valor extremo o probable error de carga). */
  conAviso: boolean;
}

export function crecimientoDePacientes(db: Database, q = ''): FilaCrecimientoPaciente[] {
  return db.patients
    .filter((p) => activo(p) && (!q.trim() || coincide(p, q)))
    .map((paciente) => {
      const mediciones = db.measurements.filter((m) => m.patientId === paciente.id && activo(m)).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
      const ultima = mediciones.length > 0 ? filasDeCrecimiento(paciente, mediciones).at(-1) : undefined;
      const medidas = ultima ? [ultima.peso, ultima.talla, ultima.pc, ultima.imc, ultima.pesoTalla] : [];
      const conAviso = medidas.some((m) => m?.resultado.ok && m.resultado.aviso);
      return { paciente, ultima, conAviso };
    })
    // Primero los que tienen avisos; después, la medición más vieja (los que hace más que no se
    // miden); al final, los que no tienen ninguna medición.
    .sort((a, b) => Number(b.conAviso) - Number(a.conAviso)
      || Number(!a.ultima) - Number(!b.ultima)
      || (a.ultima?.fecha ?? '').localeCompare(b.ultima?.fecha ?? '')
      || a.paciente.lastName.localeCompare(b.paciente.lastName));
}
