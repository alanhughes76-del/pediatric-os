/**
 * Qué se le manda a la IA (prompt maestro 7.18): el mínimo de datos para cada acción, sin DNI,
 * dirección, contactos ni nombres de la familia. El chico se nombra "el paciente". Lógica pura, con tests.
 */
type Datos = Record<string, unknown>;

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const vivos = (xs: Datos[]) => xs.filter((x) => !x.archivedAt);

/** "3 años y 5 meses", "8 meses", "12 días". */
export function edadEnTexto(nacimiento: string, hoy: string): string {
  const [a1, m1, d1] = nacimiento.split('-').map(Number);
  const [a2, m2, d2] = hoy.split('-').map(Number);
  let meses = (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (meses < 0) meses = 0;
  if (meses === 0) {
    const dias = Math.max(0, Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000));
    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anios === 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  return `${anios} ${anios === 1 ? 'año' : 'años'}${resto ? ` y ${resto} ${resto === 1 ? 'mes' : 'meses'}` : ''}`;
}

const SEXO: Record<string, string> = { F: 'femenino', M: 'masculino', X: 'no binario / no especificado' };

export interface DatosPaciente {
  paciente: Datos;
  antecedentes?: Datos;
  problemas?: Datos[];
  alergias?: Datos[];
  medicacion?: Datos[];
  consultas?: Datos[];
  notas?: Datos[];
  mediciones?: Datos[];
  vacunas?: Datos[];
  estudios?: Datos[];
  plan?: Datos[];
}

/** Encabezado común: edad, sexo y edad gestacional. Nada que identifique. */
export function encabezado(p: Datos, hoy: string): string {
  const partes = [`Paciente pediátrico de ${s(p.birthDate) ? edadEnTexto(s(p.birthDate), hoy) : 'edad no registrada'}`];
  if (SEXO[s(p.sex)]) partes.push(`sexo ${SEXO[s(p.sex)]}`);
  if (n(p.gestationalWeeks)) partes.push(`nacido a las ${n(p.gestationalWeeks)} semanas de gestación`);
  return `${partes.join(', ')}. Fecha de hoy: ${hoy}.`;
}

/** Historia resumida para "Resumir historia", "Revisar estudios" y la consulta libre. */
export function contextoHistoria(d: DatosPaciente, hoy: string): string {
  const lineas: string[] = [encabezado(d.paciente, hoy)];
  const a = d.antecedentes ?? {};
  const ant = [
    n(a.birthWeightG) ? `peso al nacer ${n(a.birthWeightG)} g` : '',
    s(a.deliveryType) ? `parto ${s(a.deliveryType)}` : '',
    s(a.perinatalNotes), s(a.pathological), s(a.family), s(a.habits), s(a.currentMedication),
  ].filter(Boolean);
  lineas.push(`ANTECEDENTES: ${ant.length ? ant.join('. ') : 'sin datos cargados'}.`);

  const problemas = vivos(d.problemas ?? []);
  lineas.push(`PROBLEMAS: ${problemas.length ? problemas.map((p) => `${s(p.description)} (${s(p.status) || 'sin estado'}${s(p.since) ? `, desde ${s(p.since)}` : ''})`).join('; ') : 'ninguno cargado'}.`);

  const alergias = vivos(d.alergias ?? []);
  lineas.push(`ALERGIAS: ${alergias.length ? alergias.map((x) => `${s(x.allergen)} (${s(x.status)}${s(x.reaction) ? `, ${s(x.reaction)}` : ''})`).join('; ') : 'ninguna cargada'}.`);

  const med = vivos(d.medicacion ?? []).filter((m) => !m.endDate || s(m.endDate) >= hoy);
  lineas.push(`MEDICACIÓN ACTUAL: ${med.length ? med.map((m) => [s(m.drug), s(m.dose)].filter(Boolean).join(' ')).join('; ') : 'ninguna cargada'}.`);

  // Últimas consultas con su nota aprobada (hallazgos y conducta, tal como los escribió el Dr.).
  const notas = vivos(d.notas ?? []).filter((x) => x.status === 'aprobada');
  const consultas = vivos(d.consultas ?? []).sort((x, y) => s(y.occurredAt).localeCompare(s(x.occurredAt))).slice(0, 6);
  if (consultas.length === 0) lineas.push('CONSULTAS: ninguna registrada.');
  for (const c of consultas) {
    const nota = notas.filter((x) => x.consultationId === c.id).sort((x, y) => (n(y.version) ?? 0) - (n(x.version) ?? 0))[0];
    lineas.push(`CONSULTA ${s(c.occurredAt).slice(0, 10)} (${s(c.visitType)}): ${nota ? `hallazgos: ${s(nota.findings) || '—'}; conducta: ${s(nota.plan) || '—'}` : 'sin nota aprobada'}.`);
  }

  const mediciones = vivos(d.mediciones ?? []).sort((x, y) => s(y.measuredAt).localeCompare(s(x.measuredAt))).slice(0, 4);
  lineas.push(`MEDICIONES: ${mediciones.length ? mediciones.map((m) => [s(m.measuredAt), n(m.weightKg) ? `peso ${n(m.weightKg)} kg` : '', n(m.heightCm) ? `talla ${n(m.heightCm)} cm` : '', n(m.headCm) ? `PC ${n(m.headCm)} cm` : ''].filter(Boolean).join(' ')).join('; ') : 'ninguna'}.`);

  const pendientes = vivos(d.vacunas ?? []).filter((v) => v.status === 'pendiente' && s(v.dueDate) && s(v.dueDate) <= hoy);
  lineas.push(`VACUNAS CON FECHA PASADA SIN APLICAR (según calendario cargado): ${pendientes.length ? pendientes.map((v) => `${s(v.vaccine)} ${s(v.dose)} (${s(v.dueDate)})`).join('; ') : 'ninguna'}.`);

  lineas.push(...lineasEstudios(d.estudios ?? []));

  const plan = vivos(d.plan ?? []).filter((i) => !i.done && !i.cancelledAt);
  lineas.push(`PLAN DE CUIDADO PENDIENTE: ${plan.length ? plan.map((i) => `${s(i.description)}${s(i.targetDate) ? ` (${s(i.targetDate)})` : ''}`).join('; ') : 'nada pendiente'}.`);
  return lineas.join('\n');
}

/** Estudios con su id (la IA los cita por id). */
export function lineasEstudios(estudios: Datos[]): string[] {
  const vivosEst = vivos(estudios);
  if (vivosEst.length === 0) return ['ESTUDIOS: ninguno registrado.'];
  return vivosEst.map((e) => `ESTUDIO [id ${String(e.id)}] ${s(e.study)}: estado ${s(e.status)}, pedido ${s(e.orderedDate)}${s(e.reviewDate) ? `, revisar el ${s(e.reviewDate)}` : ''}${s(e.resultNote) ? `, resultado: ${s(e.resultNote)}` : ''}.`);
}

/** Para "Preparar evolución": el texto de la consulta y lo mínimo del chico. */
export function contextoConsulta(d: DatosPaciente, consulta: Datos, hoy: string): string {
  const alergias = vivos(d.alergias ?? []).filter((x) => x.status === 'confirmada');
  const med = vivos(d.medicacion ?? []).filter((m) => !m.endDate || s(m.endDate) >= hoy);
  return [
    encabezado(d.paciente, hoy),
    `TIPO DE VISITA: ${s(consulta.visitType) || 'no indicado'}.`,
    `ALERGIAS CONFIRMADAS EN LA HISTORIA: ${alergias.length ? alergias.map((x) => s(x.allergen)).join(', ') : 'ninguna'}.`,
    `MEDICACIÓN ACTUAL EN LA HISTORIA: ${med.length ? med.map((m) => [s(m.drug), s(m.dose)].filter(Boolean).join(' ')).join('; ') : 'ninguna'}.`,
    'TEXTO DEL MÉDICO SOBRE ESTA CONSULTA:',
    s(consulta.rawText),
  ].join('\n');
}

/** Biblioteca del Dr. para "Sugerir material": solo título, temas y edades, con su id. */
export function contextoBiblioteca(materiales: Datos[]): string {
  const vivosMat = vivos(materiales);
  if (vivosMat.length === 0) return 'BIBLIOTECA: vacía.';
  return ['BIBLIOTECA DEL MÉDICO:', ...vivosMat.map((m) => `[id ${String(m.id)}] ${s(m.title)} · temas: ${Array.isArray(m.topics) ? m.topics.join(', ') : '—'} · edades: ${n(m.ageFromMonths) ?? 0} a ${n(m.ageToMonths) ?? '…'} meses`)].join('\n');
}
