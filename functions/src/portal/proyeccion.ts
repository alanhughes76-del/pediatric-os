/**
 * Copias para el portal de las familias (prompt maestro, regla 10 y 7.19): qué ve la familia de
 * cada dato. Es la única puerta: lo que no está acá no llega nunca al portal, ni en pantalla ni
 * leyendo la base. Lógica pura (sin Firestore), con tests. Devuelve `null` si el dato no va.
 *
 * - Notas: solo las APROBADAS, y solo el "Resumen para la familia".
 * - Alergias: solo las confirmadas. Problemas: solo los que el Dr. hizo visibles.
 * - Plan: los pendientes (ni hechos ni cancelados). Crecimiento: las mediciones.
 * - Vacunas: las aplicadas; las pendientes solo con el calendario verificado.
 * - Documentos: los habilitados (los certificados, salvo que el Dr. los oculte).
 * - Certificados: sin el motivo de anulación. Fiebre: sus registros, sin quién los revisó.
 * - Nunca: hallazgos, conducta, notas internas, borradores, alergias referidas, medicación,
 *   estudios, notas operativas de turnos, auditoría.
 */
type Datos = Record<string, unknown>;

/**
 * Subcolección clínica de origen → subcolección del portal. Documentos y materiales no van: la familia no
 * los baja desde el portal (decisión del Dr., 17/10/2026; las comunicaciones las maneja un agente aparte).
 */
export const DESTINO: Record<string, string> = {
  notes: 'summaries',
  allergies: 'allergies',
  problems: 'problems',
  carePlan: 'plan',
  growth: 'growth',
  vaccineDoses: 'vaccines',
  certificates: 'certificates',
  fever: 'fever',
};

/** Solo los campos pedidos que tienen valor. */
const tomar = (d: Datos, campos: string[]): Datos =>
  Object.fromEntries(campos.filter((c) => d[c] !== undefined && d[c] !== null).map((c) => [c, d[c]]));

export interface Contexto {
  /** Para las vacunas pendientes. */
  calendarioVerificado: boolean;
  /** Para los resúmenes: fecha y tipo de la consulta. */
  consulta?: Datos;
}

/** Copia de un dato clínico para el portal, o null si la familia no lo ve. */
export function proyectarClinico(sub: string, d: Datos | undefined, ctx: Contexto): Datos | null {
  if (!d || d.archivedAt) return null;
  switch (sub) {
    case 'notes': {
      const resumen = typeof d.familySummary === 'string' ? d.familySummary.trim() : '';
      if (d.status !== 'aprobada' || !resumen) return null;
      return {
        ...tomar(d, ['consultationId', 'version', 'approvedAt']),
        familySummary: resumen,
        ...(ctx.consulta ? tomar(ctx.consulta, ['occurredAt', 'visitType', 'modality']) : {}),
      };
    }
    case 'allergies':
      return d.status === 'confirmada' ? tomar(d, ['allergen', 'reaction', 'severity']) : null;
    case 'problems':
      return d.visibleToFamily === true ? tomar(d, ['description', 'status', 'since', 'resolvedDate']) : null;
    case 'carePlan':
      return !d.done && !d.cancelledAt ? tomar(d, ['category', 'description', 'targetDate']) : null;
    case 'growth':
      return tomar(d, ['measuredAt', 'weightKg', 'heightCm', 'headCm', 'position']);
    case 'vaccineDoses':
      if (d.status === 'aplicada') return tomar(d, ['vaccine', 'dose', 'status', 'appliedDate']);
      return ctx.calendarioVerificado ? tomar(d, ['vaccine', 'dose', 'status', 'dueDate', 'ageText']) : null;
    case 'certificates':
      return tomar(d, ['type', 'date', 'status', 'body', 'requestedBy', 'destination', 'place', 'signature', 'documentId', 'voidedAt']);
    case 'fever':
      return {
        ...tomar(d, ['kind', 'at', 'temperatureC', 'site', 'state', 'improvement', 'note', 'drug', 'drugForm', 'drugName', 'dose', 'origin', 'enteredByDoctor', 'createdBy', 'createdAt']),
        reviewed: !!d.reviewedAt,
      };
    default:
      return null;
  }
}

/** Datos del chico que necesita el portal (sin DNI, ámbito, cobertura ni grupo sanguíneo). */
export const proyectarPaciente = (d: Datos | undefined): Datos | null =>
  !d || d.archivedAt ? null : tomar(d, ['firstName', 'lastName', 'birthDate', 'sex', 'gestationalWeeks', 'gestationalDays', 'growthReferenceSex', 'familyId']);

const ESTADOS_TURNO_VISIBLES = ['solicitado', 'pendiente', 'confirmado'];

/** Turno visible para la familia: vigente, sin notas operativas ni contactos de terceros. */
export function proyectarTurno(d: Datos | undefined): Datos | null {
  if (!d || d.archivedAt || !ESTADOS_TURNO_VISIBLES.includes(String(d.status))) return null;
  const direccion = d.address as Datos | null | undefined;
  return {
    ...tomar(d, ['start', 'day', 'durationMin', 'type', 'modality', 'status', 'patientIds', 'onTheWayAt']),
    ...(direccion ? { address: tomar(direccion, ['text', 'locality']) } : {}),
  };
}

/** Familia y membresía (para el saludo y el banner). */
export function proyectarFamilia(familia: Datos | undefined, membresia: Datos | undefined, pagos: Datos[] = []): Datos {
  return {
    familyName: familia?.name ?? null,
    // Sin las observaciones del Dr.
    membership: membresia && !membresia.archivedAt ? tomar(membresia, ['plan', 'status', 'startDate', 'renewalDate']) : null,
    // Sus pagos confirmados, solo lectura (los "a confirmar" todavía no los revisó el Dr.).
    payments: pagos
      .filter((p) => !p.archivedAt && (p.status ?? 'confirmado') === 'confirmado')
      .map((p) => tomar(p, ['date', 'amount', 'currency', 'method', 'concept']))
      .sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}
