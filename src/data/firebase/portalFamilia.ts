/**
 * Portal en Firebase: arma, con las copias filtradas que lee la familia (`portal/{paciente}/{sub}`),
 * la misma forma de datos que usan las pantallas de la familia. Así las pantallas no cambian entre la
 * demostración y Firebase. Lo que no está en las copias no existe para la familia. Lógica pura, con tests.
 */
import type {
  Address, Allergy, Appointment, CarePlanItem, Certificate, ClinicalNote, ClinicalProblem, Consultation, Database, Document,
  EducationalMaterial, Family, FeverEntry, GrowthMeasurement, Guardian, MaterialDelivery, Membership, Patient, PatientRelationship, VaccineDose,
} from '../types';

type Datos = Record<string, unknown>;
export interface Fila { id: string; datos: Datos }
/** Copias de un chico: sub → filas. */
export type CopiasPaciente = Partial<Record<string, Fila[]>>;

const base = { createdAt: '', createdBy: '' };
const s = (v: unknown) => (typeof v === 'string' ? v : undefined);

export function armarVistaFamilia(p: {
  copias: Record<string, CopiasPaciente>;
  guardian: Guardian;
  addresses: Address[];
  doctor: Database['doctor'];
  vacia: Database;
}): Database {
  const { copias, guardian } = p;
  const filas = (pid: string, sub: string) => copias[pid]?.[sub] ?? [];
  const de = <T,>(sub: string, armar: (f: Fila, pid: string) => T | null): T[] =>
    Object.keys(copias).flatMap((pid) => filas(pid, sub).map((f) => armar(f, pid)).filter((x): x is T => x !== null));

  const patients: Patient[] = Object.keys(copias).flatMap((pid) => {
    const d = filas(pid, 'datos').find((f) => f.id === 'paciente')?.datos;
    if (!d) return [];
    return [{ ...base, id: pid, scope: 'sin-asignar', status: 'activo', ...(d as object) } as Patient];
  });

  // Familia y membresía (una por familia).
  const families: Family[] = [];
  const memberships: Membership[] = [];
  for (const pac of patients) {
    const d = filas(pac.id, 'datos').find((f) => f.id === 'familia')?.datos;
    const familyId = pac.familyId;
    if (!d || !familyId || families.some((f) => f.id === familyId)) continue;
    families.push({ ...base, id: familyId, name: s(d.familyName) ?? 'Tu familia' });
    const m = d.membership as Datos | null;
    if (m) {
      memberships.push({
        ...base, id: `m-${familyId}`, familyId, plan: m.plan as Membership['plan'], status: m.status as Membership['status'],
        startDate: s(m.startDate) ?? '', renewalDate: s(m.renewalDate) ?? '',
        patientIds: patients.filter((x) => x.familyId === familyId).map((x) => x.id),
      });
    }
  }

  const relationships: PatientRelationship[] = patients.map((pac) => ({
    ...base, id: `r-${pac.id}-${guardian.id}`, patientId: pac.id, guardianId: guardian.id, type: 'otro', isPrimary: true, validFrom: '',
  }));

  const notes: ClinicalNote[] = de('summaries', (f, pid) => ({
    ...base, id: f.id, patientId: pid, consultationId: s(f.datos.consultationId) ?? '', version: Number(f.datos.version ?? 1),
    status: 'aprobada', origin: 'humano', familySummary: s(f.datos.familySummary) ?? '',
    findings: '', plan: '', allergiesMedication: '', clinicalFlag: false, approvedAt: s(f.datos.approvedAt), updatedAt: s(f.datos.approvedAt) ?? '',
  } as ClinicalNote));
  const consultations: Consultation[] = de('summaries', (f, pid) => (s(f.datos.consultationId) && s(f.datos.occurredAt) ? {
    ...base, id: s(f.datos.consultationId)!, patientId: pid, occurredAt: s(f.datos.occurredAt)!,
    visitType: (s(f.datos.visitType) ?? 'control') as Consultation['visitType'], modality: (s(f.datos.modality) ?? 'domicilio') as Consultation['modality'],
    status: 'realizada', rawText: '',
  } : null));

  const plano = <T,>(sub: string, extra: (d: Datos) => Partial<T> = () => ({})) =>
    de<T>(sub, (f, pid) => ({ ...base, ...f.datos, ...extra(f.datos), id: f.id, patientId: pid }) as T);

  const materiales = de<{ envio: MaterialDelivery; material: EducationalMaterial }>('materials', (f, pid) => ({
    envio: { ...base, id: f.id, patientId: pid, materialId: s(f.datos.materialId) ?? '', sentAt: s(f.datos.sentAt) ?? '' },
    material: {
      ...base, id: s(f.datos.materialId) ?? f.id, title: s(f.datos.title) ?? '', kind: (f.datos.kind as EducationalMaterial['kind']) ?? 'enlace',
      url: s(f.datos.url), topics: Array.isArray(f.datos.topics) ? (f.datos.topics as string[]) : [],
    },
  }));

  const appointments: Appointment[] = [];
  for (const f of de<Fila>('turnos', (x) => x)) {
    if (appointments.some((a) => a.id === f.id)) continue; // un turno de hermanos aparece en las dos copias
    const d = f.datos;
    appointments.push({
      ...base, id: f.id, start: s(d.start) ?? '', day: s(d.day) ?? '', durationMin: Number(d.durationMin ?? 0),
      type: d.type as Appointment['type'], modality: (d.modality as Appointment['modality']) ?? 'domicilio', familyId: null,
      patientIds: Array.isArray(d.patientIds) ? (d.patientIds as string[]) : [], address: (d.address as Appointment['address']) ?? null,
      zone: null, reason: '', opsNotes: '', status: d.status as Appointment['status'], origin: 'medico', onTheWayAt: s(d.onTheWayAt),
    });
  }

  return {
    ...p.vacia,
    doctor: p.doctor,
    families,
    guardians: [guardian],
    relationships,
    addresses: p.addresses.filter((a) => a.guardianId === guardian.id && !a.archivedAt),
    patients,
    memberships,
    notes,
    consultations,
    allergies: plano<Allergy>('allergies', () => ({ status: 'confirmada' })),
    problems: plano<ClinicalProblem>('problems', () => ({ visibleToFamily: true })),
    carePlan: plano<CarePlanItem>('plan', () => ({ done: false })),
    measurements: plano<GrowthMeasurement>('growth'),
    vaccineDoses: plano<VaccineDose>('vaccines', () => ({ source: 'calendario' })),
    documents: plano<Document>('documents', () => ({ file: '', visibleToFamily: true })),
    certificates: plano<Certificate>('certificates'),
    fever: plano<FeverEntry>('fever', (d) => ({ reviewedAt: d.reviewed ? 'revisado' : undefined })),
    educationalMaterials: materiales.map((x) => x.material).filter((m, i, xs) => xs.findIndex((y) => y.id === m.id) === i),
    materialDeliveries: materiales.map((x) => x.envio),
    appointments,
    // Las vacunas pendientes solo llegan si el Dr. verificó el calendario: lo que llega, se muestra.
    vacunas: { calendarioVerificado: true },
  };
}
