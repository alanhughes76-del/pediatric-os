/**
 * Vista de los datos para un adulto del portal.
 *
 * Es la ÚNICA puerta de datos de las pantallas de la familia: el store la aplica
 * antes de entregar los datos, así que lo oculto no llega nunca a la interfaz.
 * En la etapa del backend, estas mismas reglas van como reglas de acceso del servidor.
 *
 * Reglas:
 * - Solo los chicos con los que el adulto tiene un vínculo vigente (y sus familias).
 * - Notas: solo las APROBADAS, y solo el "Resumen para la familia". Hallazgos, conducta,
 *   alergias y medicación de la nota quedan vacíos. Nunca borradores ni versiones reemplazadas.
 * - Consultas: fecha, tipo y modalidad; nunca el texto original.
 * - Problemas: solo los que el médico hizo visibles. Alergias: solo las confirmadas.
 * - Otros adultos vinculados a los mismos chicos: solo el nombre (sin email ni teléfono).
 * - Turnos: los de sus hijos o su familia, sin notas operativas ni historial.
 * - Nada interno: hitos marcados, seguimientos ni registro de auditoría.
 */
import type { Database, ID } from './types';
import { hoyISO } from '@/lib/fechas';

export function vistaFamilia(db: Database, guardianId: ID): Database {
  const hoy = hoyISO();
  const vigente = (r: Database['relationships'][number]) => !r.archivedAt && (!r.validTo || r.validTo > hoy);

  const propias = db.relationships.filter((r) => r.guardianId === guardianId && vigente(r));
  const pacienteIds = new Set(propias.map((r) => r.patientId));
  const patients = db.patients.filter((p) => pacienteIds.has(p.id) && !p.archivedAt);
  const relationships = db.relationships.filter((r) => pacienteIds.has(r.patientId) && vigente(r));
  const adultoIds = new Set([guardianId, ...relationships.map((r) => r.guardianId)]);
  const yo = db.guardians.find((g) => g.id === guardianId);
  const familyIds = new Set([...patients.map((p) => p.familyId), yo?.familyId].filter((x): x is string => !!x));
  const delPaciente = <T extends { patientId: ID; archivedAt?: string }>(filas: T[]) => filas.filter((f) => pacienteIds.has(f.patientId) && !f.archivedAt);

  const memberships = db.memberships.filter((m) => familyIds.has(m.familyId) && !m.archivedAt);
  const membershipIds = new Set(memberships.map((m) => m.id));

  return {
    doctor: db.doctor,
    families: db.families.filter((f) => familyIds.has(f.id)),
    guardians: db.guardians
      .filter((g) => adultoIds.has(g.id))
      .map((g) => (g.id === guardianId ? g : { ...g, email: '', phone: undefined })),
    relationships,
    addresses: db.addresses.filter((a) => adultoIds.has(a.guardianId) && !a.archivedAt),
    patients,
    memberships,
    // Sus pagos confirmados (de la membresía o de la familia), sin los archivados. Solo lectura.
    payments: db.payments.filter((p) => !p.archivedAt && (p.status ?? 'confirmado') === 'confirmado' && ((p.membershipId && membershipIds.has(p.membershipId)) || (p.familyId && familyIds.has(p.familyId)))),
    // Los antecedentes no se muestran en el portal.
    backgrounds: [],
    problems: delPaciente(db.problems).filter((p) => p.visibleToFamily),
    allergies: delPaciente(db.allergies).filter((a) => a.status === 'confirmada'),
    consultations: delPaciente(db.consultations).map((c) => ({ ...c, rawText: '' })),
    measurements: delPaciente(db.measurements),
    milestoneChecks: [],
    notes: delPaciente(db.notes)
      .filter((n) => n.status === 'aprobada')
      .map((n) => ({ ...n, findings: '', plan: '', allergiesMedication: '', clinicalFlag: false })),
    followUps: [],
    carePlan: delPaciente(db.carePlan).filter((i) => !i.cancelledAt),
    // Vacunas sí (prompt maestro, regla 10); medicación, prescripciones y estudios no.
    vaccineDoses: delPaciente(db.vaccineDoses),
    medications: [],
    prescriptions: [],
    studies: [],
    fever: delPaciente(db.fever),
    certificates: delPaciente(db.certificates).map((c) => ({ ...c, voidReason: undefined })),
    // Documentos y materiales no: la familia no baja archivos desde el portal (decisión del Dr., 17/10/2026).
    documents: [],
    // Turnos de sus hijos o de su familia, sin notas operativas ni contactos de terceros; sin historial ni bloqueos.
    appointments: db.appointments
      .filter((a) => !a.archivedAt && (a.patientIds.some((id) => pacienteIds.has(id)) || (a.familyId !== null && familyIds.has(a.familyId))))
      .map(({ opsNotes: _ops, porIdentificar: _contacto, ...a }) => ({ ...a, opsNotes: '' })),
    appointmentHistory: [],
    blocks: [],
    communications: [],
    notifications: [],
    materialDeliveries: [],
    educationalMaterials: [],
    agenda: db.agenda,
    ia: { enabled: false },
    vacunas: db.vacunas,
    links: db.links,
    precios: db.precios,
    ambitos: db.ambitos,
    plantillas: {},
    auditLog: [],
  };
}
