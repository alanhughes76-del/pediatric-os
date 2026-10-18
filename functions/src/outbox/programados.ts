/**
 * Qué avisos programados corresponden hoy (lógica pura, sin Firebase; tests en tests/funciones/).
 * Cada uno devuelve la `clave` con la que el evento sale una sola vez, y los datos mínimos.
 * Las fechas son de Argentina: `hoy` = AAAA-MM-DD, `ahoraMs` = milisegundos.
 */
type Datos = Record<string, unknown> & { id: string };
export interface Aviso { clave: string; data: Record<string, unknown> }

const DIA = 86_400_000;
const sumarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * DIA).toISOString().slice(0, 10);
const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / DIA);
const s = (v: unknown) => (typeof v === 'string' ? v : '');

/** Turnos confirmados que empiezan dentro de 23 a 25 horas (la función corre cada hora). */
export function recordatorios24h(turnos: Datos[], ahoraMs: number): Aviso[] {
  return turnos
    .filter((t) => t.status === 'confirmado' && !t.archivedAt)
    .filter((t) => { const ms = Date.parse(s(t.start)); return ms > ahoraMs + 23 * 3_600_000 && ms <= ahoraMs + 25 * 3_600_000; })
    .map((t) => ({
      clave: `${t.id}_${s(t.start)}`,
      data: { appointmentId: t.id, familyId: t.familyId ?? null, patientIds: t.patientIds ?? [], tipoVisita: t.type ?? null, start: t.start, durationMin: t.durationMin ?? null, modality: t.modality ?? null },
    }));
}

/** Seguimientos pendientes con la fecha pasada. */
export function seguimientosVencidos(seguimientos: Datos[], ahoraISO: string): Aviso[] {
  return seguimientos
    .filter((f) => f.status === 'pendiente' && !f.archivedAt && s(f.dueAt) && Date.parse(s(f.dueAt)) < Date.parse(ahoraISO))
    .map((f) => ({ clave: f.id, data: { followUpId: f.id, patientId: f.patientId, dueAt: f.dueAt } }));
}

/** Vacunas: solo con el calendario verificado. Próximas = vencen en 14 días; atrasadas = ya vencieron. Sin el nombre de la vacuna. */
export function avisosVacunas(dosis: Datos[], hoy: string, calendarioVerificado: boolean): { proximas: Aviso[]; atrasadas: Aviso[] } {
  if (!calendarioVerificado) return { proximas: [], atrasadas: [] };
  const pendientes = dosis.filter((d) => d.status === 'pendiente' && !d.archivedAt && s(d.dueDate));
  const hasta = sumarDias(hoy, 14);
  const dato = (d: Datos) => ({ doseId: d.id, patientId: d.patientId, dueDate: d.dueDate });
  return {
    proximas: pendientes.filter((d) => s(d.dueDate) >= hoy && s(d.dueDate) <= hasta).map((d) => ({ clave: d.id, data: dato(d) })),
    atrasadas: pendientes.filter((d) => s(d.dueDate) < hoy).map((d) => ({ clave: d.id, data: dato(d) })),
  };
}

/** Estudios sin revisar cuyo "Revisar resultado el" ya llegó. Sin el nombre del estudio. */
export function estudiosParaRevisar(estudios: Datos[], hoy: string): Aviso[] {
  return estudios
    .filter((e) => !e.archivedAt && e.status !== 'revisado' && s(e.reviewDate) && s(e.reviewDate) <= hoy)
    .map((e) => ({ clave: `${e.id}_${s(e.reviewDate)}`, data: { studyId: e.id, patientId: e.patientId, reviewDate: e.reviewDate, estado: e.status } }));
}

/** Membresías activas que se renuevan en 30 días o menos: un aviso a los 30 y otro 20 días después. */
export function membresiasPorRenovar(membresias: Datos[], hoy: string): Aviso[] {
  return membresias
    .filter((m) => m.status === 'activa' && !m.archivedAt && s(m.renewalDate))
    .map((m) => ({ m, dias: diasEntre(hoy, s(m.renewalDate)) }))
    .filter(({ dias }) => dias >= 0 && dias <= 30)
    .map(({ m, dias }) => ({
      clave: `${m.id}_${dias > 10 ? 1 : 2}`,
      data: { membershipId: m.id, familyId: m.familyId, patientIds: m.patientIds ?? [], renewalDate: m.renewalDate, diasRestantes: dias },
    }));
}

/**
 * Pago vencido (aviso al Dr.): la membresía más nueva de la familia lleva 15 días o más vencida,
 * no está cancelada y no hay ningún pago confirmado desde la fecha de renovación.
 */
export function pagosVencidos(membresias: Datos[], pagos: Datos[], hoy: string): Aviso[] {
  const ultimas = new Map<string, Datos>();
  for (const m of membresias.filter((x) => !x.archivedAt && s(x.familyId))) {
    const previa = ultimas.get(s(m.familyId));
    if (!previa || s(m.renewalDate) > s(previa.renewalDate)) ultimas.set(s(m.familyId), m);
  }
  return [...ultimas.values()]
    .filter((m) => m.status !== 'cancelada' && s(m.renewalDate) && diasEntre(s(m.renewalDate), hoy) >= 15)
    .filter((m) => !pagos.some((p) => !p.archivedAt && (p.status ?? 'confirmado') === 'confirmado'
      && (p.familyId === m.familyId || p.membershipId === m.id) && s(p.date) >= s(m.renewalDate)))
    .map((m) => ({ clave: `${m.id}_${s(m.renewalDate)}`, data: { membershipId: m.id, familyId: m.familyId, renewalDate: m.renewalDate, diasVencida: diasEntre(s(m.renewalDate), hoy) } }));
}

/** Controles del plan de cuidado en los próximos 7 días (sin la descripción: puede ser clínica). */
export function controlesProximos(plan: Datos[], hoy: string): Aviso[] {
  const hasta = sumarDias(hoy, 7);
  return plan
    .filter((i) => i.category === 'control' && !i.done && !i.cancelledAt && !i.archivedAt && s(i.targetDate) >= hoy && s(i.targetDate) <= hasta)
    .map((i) => ({ clave: `${i.id}_${s(i.targetDate)}`, data: { carePlanItemId: i.id, patientId: i.patientId, targetDate: i.targetDate } }));
}
