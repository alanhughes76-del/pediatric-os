/**
 * Datos de ejemplo. TODO es ficticio: ninguna familia ni paciente es real.
 * Lo que pasa "hoy" (turnos, fiebre, seguimientos) se calcula a partir de la fecha
 * actual para que la demo siempre tenga algo que mostrar.
 */
import type { Appointment, AppointmentChange, Database, Base, VaccineDose } from './types';
import { enDias, hoyISO, sumarDias, sumarHoras } from '@/lib/fechas';
import { pacientesExtra } from './mockPacientes';
import { FIRMA, textoCertificado, tipoCertificado } from '@/lib/certificados';
import { normalizarTelefono } from '@shared/telefono';
import { CONFIG_AGENDA_INICIAL, diaDe, type EstadoTurno } from '@shared/agenda';
import { esquemaPara, type DosisDelEsquema } from '@shared/vacunas';

export const DOCTOR_ID = 'dr';
const hoy = hoyISO();

/** Campos base: id + alta (por defecto, cargado por el médico). */
const b = (id: string, createdAt: string, createdBy = DOCTOR_ID): Base => ({ id, createdAt, createdBy });

/** Turno de ejemplo; la dirección es una copia de la del adulto. */
function turno(id: string, dias: number, hhmm: string, t: Partial<Appointment> & Pick<Appointment, 'type' | 'patientIds' | 'familyId'>, status: EstadoTurno = 'confirmado'): Appointment {
  const start = enDias(dias, hhmm);
  const creado = enDias(Math.min(dias, 0) - 2, '10:00');
  return {
    ...b(id, creado), start, day: diaDe(start), durationMin: CONFIG_AGENDA_INICIAL.duracionMin[t.type], modality: 'domicilio',
    address: null, zone: null, reason: '', opsNotes: '', status, origin: 'medico', updatedAt: creado, updatedBy: DOCTOR_ID, ...t,
  };
}

const turnos: Appointment[] = [
  turno('t-hoy-1', 0, '09:30', { type: 'control', familyId: 'f-benitez', patientIds: ['p-olivia'], address: { text: 'Los Aromos 120, Barrio Los Cardales', locality: 'Exaltación de la Cruz', addressId: 'ad-paula' }, zone: 'GBA Zona Norte' }),
  turno('t-hoy-2', 0, '12:00', { type: 'urgencia-dia', familyId: 'f-rios', patientIds: ['p-valentina'], address: { text: 'Av. del Libertador 15800', locality: 'San Isidro', addressId: 'ad-julieta' }, zone: 'GBA Zona Norte', origin: 'calcom', reason: 'Fiebre desde ayer', calBookingUid: 'demo-1' }),
  turno('t-hoy-3', 0, '17:30', { type: 'control', familyId: 'f-ferreyra', patientIds: ['p-tomas'], address: { text: 'Libertador 2210', locality: 'Olivos', addressId: 'ad-martin' }, zone: 'GBA Zona Norte', opsNotes: 'Esta semana está en lo del papá.' }),
  turno('t-prox-emma', 5, '10:00', { type: 'control', familyId: 'f-ferreyra', patientIds: ['p-emma', 'p-tomas'], address: { text: 'Av. Maipú 1450, 3.º B', locality: 'Vicente López', addressId: 'ad-lucia' }, zone: 'GBA Zona Norte', reason: 'Control de los dos hermanos' }),
  turno('t-sol-1', 1, '10:00', {
    type: 'control', familyId: null, patientIds: [], address: { text: 'Av. Santa Fe 3200', locality: 'Palermo, CABA' }, zone: 'CABA', origin: 'calcom', reason: 'Control de salud', calBookingUid: 'demo-2',
    porIdentificar: { name: 'Sofía Prueba', email: 'sofia@ejemplo.com', phone: '+5491155550707', dni: '54111222' },
  }, 'solicitado'),
  turno('t-pend-1', 1, '15:00', { type: 'seguimiento', familyId: 'f-sosa', patientIds: ['p-mateo'], address: { text: 'Arenales 2950, 7.º A', locality: 'Recoleta, CABA', addressId: 'ad-diego' }, zone: 'CABA' }, 'pendiente'),
  turno('t-mateo', -3, '10:00', { type: 'seguimiento', familyId: 'f-sosa', patientIds: ['p-mateo'], address: { text: 'Arenales 2950, 7.º A', locality: 'Recoleta, CABA', addressId: 'ad-diego' }, zone: 'CABA' }, 'realizado'),
  turno('t-cancel-1', -1, '11:00', { type: 'control', familyId: 'f-godoy', patientIds: ['p-benjamin'], address: { text: 'Gorriti 4820', locality: 'Palermo, CABA', addressId: 'ad-carolina' }, zone: 'CABA', cancelReason: 'La familia pidió pasarlo' }, 'cancelado'),
];

/** Historial mínimo: el alta (o la solicitud) y, si corresponde, el último cambio. */
const historial: AppointmentChange[] = turnos.flatMap((t, i) => {
  const ms = Date.parse(t.createdAt) + i;
  const inicial = t.status === 'solicitado' ? 'solicitado' : t.status === 'pendiente' ? 'pendiente' : 'confirmado';
  const alta: AppointmentChange = {
    id: `th-${t.id}-1`, appointmentId: t.id, at: t.createdAt, atMs: ms, actorId: t.origin === 'calcom' ? 'calcom' : DOCTOR_ID,
    action: t.origin === 'calcom' ? 'solicitud' : 'crear', before: null, after: { status: t.origin === 'calcom' ? 'solicitado' : inicial, start: t.start, durationMin: t.durationMin },
  };
  const ultimo: AppointmentChange['action'] | null = t.status === 'cancelado' ? 'cancelar' : t.status === 'realizado' ? 'realizado' : t.origin === 'calcom' && t.status === 'confirmado' ? 'confirmar' : null;
  if (!ultimo) return [alta];
  return [alta, {
    id: `th-${t.id}-2`, appointmentId: t.id, at: t.createdAt, atMs: ms + 1000, actorId: DOCTOR_ID, action: ultimo,
    before: alta.after, after: { status: t.status, start: t.start, durationMin: t.durationMin }, ...(t.cancelReason ? { reason: t.cancelReason } : {}),
  }];
});

/**
 * Esquema de vacunas de ejemplo según el calendario (borrador). `aplicada` devuelve la fecha de
 * aplicación de cada dosis, o null si quedó pendiente. Todo es ficticio.
 */
function esquema(patientId: string, nacimiento: string, aplicada: (d: DosisDelEsquema) => string | null): VaccineDose[] {
  return esquemaPara(nacimiento).map((d) => {
    const fecha = aplicada(d);
    return {
      ...b(`vd-${patientId}-${d.clave}`, `${nacimiento}T12:00:00-03:00`), patientId, vaccine: d.vaccine, dose: d.dose,
      ageText: d.ageText, ageMonths: d.ageMonths, dueDate: d.dueDate, source: 'calendario',
      ...(fecha ? { status: 'aplicada' as const, appliedDate: fecha, place: 'Vacunatorio de ejemplo' } : { status: 'pendiente' as const }),
    };
  });
}

const vacunasDeEjemplo: VaccineDose[] = [
  // Tomás: todo aplicado salvo la triple bacteriana de los 15-18 meses (queda atrasada).
  ...esquema('p-tomas', '2023-05-12', (d) => {
    if (d.ageMonths > 18 || d.vaccine.startsWith('Triple bacteriana celular')) return null;
    if (d.vaccine === 'Triple Viral (SRP)' && d.dose === '1ª') return '2024-05-13';
    if (d.vaccine === 'Hepatitis A') return '2024-05-13';
    if (d.vaccine === 'Varicela') return '2024-08-20';
    return d.dueDate;
  }),
  { ...b('vd-p-tomas-antigripal-2026', '2026-04-22T12:00:00-03:00'), patientId: 'p-tomas', vaccine: 'Antigripal', dose: '2026', status: 'aplicada', appliedDate: '2026-04-22', place: 'Vacunatorio de ejemplo', source: 'manual' },
  // Emma: recién nacido, quíntuple, IPV y la 1.ª de neumococo aplicadas; meningococo y 2.ª de neumococo atrasadas.
  ...esquema('p-emma', '2026-01-20', (d) => {
    if (d.ageMonths === 0) return '2026-01-20';
    if (d.vaccine.startsWith('Quíntuple') || d.vaccine.startsWith('IPV')) {
      return d.dose === '1ª' ? '2026-03-20' : d.dose === '2ª' ? '2026-05-20' : d.dose === '3ª' ? '2026-07-21' : null;
    }
    if (d.vaccine === 'Neumococo conjugada' && d.dose === '1ª') return '2026-03-20';
    if (d.vaccine === 'Rotavirus') return d.dose === '1ª' ? '2026-03-20' : d.dose === '2ª' ? '2026-05-20' : null;
    return null;
  }),
  // Benjamín: BCG y hepatitis B del recién nacido.
  ...esquema('p-benjamin', '2026-09-10', (d) => (d.vaccine === 'BCG' ? '2026-09-11' : d.vaccine === 'Hepatitis B' ? '2026-09-10' : null)),
];

// Consultas con fecha relativa (las usan notas, seguimientos y fiebre)
const consBenjaminAyer = enDias(-1, '20:30');
const consMateo = enDias(-3, '10:00');

const base: Database = {
  doctor: {
    id: DOCTOR_ID,
    name: 'Dr. Alan Hughes',
    email: 'medico@ejemplo.com',
    signature: 'Dr. Alan Hughes · Médico Pediatra · MN 111.725 · MP 448.970',
  },

  families: [
    { ...b('f-ferreyra', '2026-02-20T10:00:00-03:00'), name: 'Familia Ruiz Ferreyra' },
    { ...b('f-godoy', '2026-04-01T10:00:00-03:00'), name: 'Familia Godoy' },
    { ...b('f-benitez', '2025-10-28T10:00:00-03:00'), name: 'Familia Benítez' },
    { ...b('f-rios', '2026-03-10T10:00:00-03:00'), name: 'Familia Ríos' },
    { ...b('f-sosa', '2026-07-02T10:00:00-03:00'), name: 'Familia Sosa' },
    { ...b('f-pereyra', '2026-09-01T10:00:00-03:00'), name: 'Familia Pereyra' },
  ],

  guardians: [
    { ...b('g-lucia', '2026-02-20T10:00:00-03:00'), familyId: 'f-ferreyra', firstName: 'Lucía', lastName: 'Ferreyra', email: 'lucia@ejemplo.com', phone: '11 5555-0101', accessEnabled: true },
    { ...b('g-martin', '2026-02-20T10:00:00-03:00'), familyId: 'f-ferreyra', firstName: 'Martín', lastName: 'Ruiz', email: 'martin@ejemplo.com', phone: '11 5555-0102', accessEnabled: true },
    { ...b('g-carolina', '2026-04-01T10:00:00-03:00'), familyId: 'f-godoy', firstName: 'Carolina', lastName: 'Godoy', email: 'carolina@ejemplo.com', phone: '11 5555-0202', accessEnabled: true },
    { ...b('g-paula', '2025-10-28T10:00:00-03:00'), familyId: 'f-benitez', firstName: 'Paula', lastName: 'Benítez', email: 'paula@ejemplo.com', phone: '11 5555-0303', accessEnabled: true },
    { ...b('g-julieta', '2026-03-10T10:00:00-03:00'), familyId: 'f-rios', firstName: 'Julieta', lastName: 'Ríos', email: 'julieta@ejemplo.com', phone: '11 5555-0404', accessEnabled: true },
    { ...b('g-diego', '2026-07-02T10:00:00-03:00'), familyId: 'f-sosa', firstName: 'Diego', lastName: 'Sosa', email: 'diego@ejemplo.com', phone: '11 5555-0505', accessEnabled: false },
    { ...b('g-marina', '2026-09-01T10:00:00-03:00'), familyId: 'f-pereyra', firstName: 'Marina', lastName: 'Pereyra', email: 'marina@ejemplo.com', phone: '11 5555-0606', accessEnabled: true },
  ],

  addresses: [
    { ...b('ad-lucia', '2026-02-20T10:00:00-03:00'), guardianId: 'g-lucia', street: 'Av. Maipú 1450, 3.º B', locality: 'Vicente López', notes: 'Timbre 3B. Hay un perro que ladra pero es bueno.' },
    { ...b('ad-martin', '2026-02-20T10:00:00-03:00'), guardianId: 'g-martin', street: 'Libertador 2210', locality: 'Olivos' },
    { ...b('ad-carolina', '2026-04-01T10:00:00-03:00'), guardianId: 'g-carolina', street: 'Gorriti 4820', locality: 'Palermo, CABA' },
    { ...b('ad-paula', '2025-10-28T10:00:00-03:00'), guardianId: 'g-paula', street: 'Los Aromos 120, Barrio Los Cardales', locality: 'Exaltación de la Cruz', notes: 'Casa con portón verde.' },
    { ...b('ad-julieta', '2026-03-10T10:00:00-03:00'), guardianId: 'g-julieta', street: 'Av. del Libertador 15800', locality: 'San Isidro' },
    { ...b('ad-diego', '2026-07-02T10:00:00-03:00'), guardianId: 'g-diego', street: 'Arenales 2950, 7.º A', locality: 'Recoleta, CABA' },
    { ...b('ad-marina', '2026-09-01T10:00:00-03:00'), guardianId: 'g-marina', street: 'Belgrano 450', locality: 'Tigre' },
  ],

  patients: [
    { ...b('p-tomas', '2026-02-20T10:00:00-03:00'), familyId: 'f-ferreyra', firstName: 'Tomás', lastName: 'Ruiz Ferreyra', birthDate: '2023-05-12', sex: 'M', dni: '58.912.345', scope: 'membresia', status: 'activo' },
    { ...b('p-emma', '2026-02-20T10:00:00-03:00'), familyId: 'f-ferreyra', firstName: 'Emma', lastName: 'Ruiz Ferreyra', birthDate: '2026-01-20', sex: 'F', gestationalWeeks: 34, gestationalDays: 3, scope: 'membresia', status: 'activo' },
    { ...b('p-benjamin', '2026-09-12T10:00:00-03:00'), familyId: 'f-godoy', firstName: 'Benjamín', lastName: 'Godoy', birthDate: '2026-09-10', sex: 'M', gestationalWeeks: 38, scope: 'membresia', status: 'activo' },
    { ...b('p-olivia', '2025-10-28T10:00:00-03:00'), familyId: 'f-benitez', firstName: 'Olivia', lastName: 'Benítez', birthDate: '2021-07-03', sex: 'F', gestationalWeeks: 40, gestationalDays: 1, scope: 'cardales', status: 'activo' },
    { ...b('p-valentina', '2026-03-10T10:00:00-03:00'), familyId: 'f-rios', firstName: 'Valentina', lastName: 'Ríos', birthDate: '2024-03-08', sex: 'F', scope: 'hepta', status: 'activo' },
    { ...b('p-mateo', '2026-07-02T10:00:00-03:00'), familyId: 'f-sosa', firstName: 'Mateo', lastName: 'Sosa', birthDate: '2019-02-14', sex: 'M', scope: 'esporadico', status: 'activo' },
    { ...b('p-alex', '2026-09-01T10:00:00-03:00'), familyId: 'f-pereyra', firstName: 'Alex', lastName: 'Pereyra', birthDate: '2025-06-01', sex: 'X', scope: 'sin-asignar', status: 'activo' },
  ],

  relationships: [
    { ...b('r1', '2026-02-20T10:00:00-03:00'), patientId: 'p-tomas', guardianId: 'g-lucia', type: 'madre', isPrimary: true, validFrom: '2026-02-20' },
    { ...b('r2', '2026-02-20T10:00:00-03:00'), patientId: 'p-tomas', guardianId: 'g-martin', type: 'padre', isPrimary: false, validFrom: '2026-02-20' },
    { ...b('r3', '2026-02-20T10:00:00-03:00'), patientId: 'p-emma', guardianId: 'g-lucia', type: 'madre', isPrimary: true, validFrom: '2026-02-20' },
    { ...b('r4', '2026-02-20T10:00:00-03:00'), patientId: 'p-emma', guardianId: 'g-martin', type: 'padre', isPrimary: false, validFrom: '2026-02-20' },
    { ...b('r5', '2026-09-12T10:00:00-03:00'), patientId: 'p-benjamin', guardianId: 'g-carolina', type: 'madre', isPrimary: true, validFrom: '2026-09-12' },
    { ...b('r6', '2025-10-28T10:00:00-03:00'), patientId: 'p-olivia', guardianId: 'g-paula', type: 'madre', isPrimary: true, validFrom: '2025-10-28' },
    { ...b('r7', '2026-03-10T10:00:00-03:00'), patientId: 'p-valentina', guardianId: 'g-julieta', type: 'madre', isPrimary: true, validFrom: '2026-03-10' },
    { ...b('r8', '2026-07-02T10:00:00-03:00'), patientId: 'p-mateo', guardianId: 'g-diego', type: 'padre', isPrimary: true, validFrom: '2026-07-02' },
    { ...b('r9', '2026-09-01T10:00:00-03:00'), patientId: 'p-alex', guardianId: 'g-marina', type: 'madre', isPrimary: true, validFrom: '2026-09-01' },
  ],

  memberships: [
    { ...b('m-ferreyra', '2026-02-20T10:00:00-03:00'), familyId: 'f-ferreyra', plan: 'anual', status: 'activa', startDate: '2026-03-01', renewalDate: '2027-02-28', patientIds: ['p-tomas', 'p-emma'] },
    { ...b('m-godoy', '2026-04-01T10:00:00-03:00'), familyId: 'f-godoy', plan: 'semestral', status: 'vencida', startDate: '2026-04-05', renewalDate: sumarDias(hoy, -4), patientIds: ['p-benjamin'] },
  ],

  payments: [
    { ...b('pg-1', '2026-03-01T12:00:00-03:00'), membershipId: 'm-ferreyra', date: '2026-03-01', amount: 600, currency: 'USD', method: 'transferencia' },
    { ...b('pg-2', '2026-04-05T12:00:00-03:00'), membershipId: 'm-godoy', date: '2026-04-05', amount: 450000, currency: 'ARS', method: 'mercadopago' },
  ],

  // Antecedentes (ficticios). El peso al nacer de Emma coincide con su primera medición.
  backgrounds: [
    { ...b('ant-p-emma', '2026-02-20T10:00:00-03:00'), patientId: 'p-emma', birthWeightG: 2150 },
  ],

  problems: [
    { ...b('pr-t1', '2026-02-20T10:00:00-03:00'), patientId: 'p-tomas', description: 'Dermatitis atópica leve', status: 'activo', since: '2024-01-10', visibleToFamily: true },
    { ...b('pr-t2', '2025-11-18T12:00:00-03:00'), patientId: 'p-tomas', description: 'Soplo cardíaco en estudio (probablemente funcional)', status: 'activo', since: '2025-11-18', visibleToFamily: false },
    { ...b('pr-t3', '2026-06-09T22:00:00-03:00'), patientId: 'p-tomas', description: 'Otitis media aguda derecha', status: 'resuelto', since: '2026-06-09', resolvedDate: '2026-06-20', visibleToFamily: true },
    { ...b('pr-e1', '2026-02-20T10:00:00-03:00'), patientId: 'p-emma', description: 'Prematurez (34 semanas)', status: 'activo', since: '2026-01-20', visibleToFamily: true },
    { ...b('pr-e2', '2026-08-20T12:00:00-03:00'), patientId: 'p-emma', description: 'Sospecha de alergia a la proteína de leche de vaca', status: 'resuelto', since: '2026-08-20', resolvedDate: '2026-09-22', visibleToFamily: false },
  ],

  allergies: [
    { ...b('al-t1', '2026-02-20T10:00:00-03:00'), patientId: 'p-tomas', allergen: 'Amoxicilina', reaction: 'Urticaria generalizada (2024)', severity: 'moderada', status: 'confirmada' },
    { ...b('al-o1', '2025-10-28T10:00:00-03:00'), patientId: 'p-olivia', allergen: 'Maní', reaction: 'Hinchazón de labios', severity: 'grave', status: 'confirmada' },
    { ...b('al-e1', '2026-08-20T12:00:00-03:00'), patientId: 'p-emma', allergen: 'Proteína de leche de vaca', reaction: 'Deposiciones con moco', severity: 'leve', status: 'referida' },
  ],

  consultations: [
    // Tomás
    { ...b('c-t1', '2025-11-18T12:00:00-03:00'), patientId: 'p-tomas', occurredAt: '2025-11-18T10:30:00-03:00', modality: 'domicilio', visitType: 'control', status: 'realizada', addressId: 'ad-lucia',
      rawText: 'Control de los 2 años y medio. Come de todo, duerme bien. Habla frases de 3 palabras. Piel con placas de dermatitis en pliegues, mejor con la crema. Soplo sistólico 1/6 en borde esternal izquierdo, sin irradiación. Seguir con hidratación de la piel dos veces por día.' },
    { ...b('c-t2', '2026-06-09T20:00:00-03:00'), patientId: 'p-tomas', occurredAt: '2026-06-09T19:00:00-03:00', modality: 'domicilio', visitType: 'urgencia-noche', status: 'realizada', addressId: 'ad-lucia',
      rawText: 'Dolor de oído derecho desde ayer, fiebre 38,4. Otoscopia: tímpano derecho abombado y eritematoso. Alérgico a amoxicilina. Indico tratamiento por mensaje. Control si sigue con fiebre a las 48-72 h.' },
    // Emma
    { ...b('c-e1', '2026-08-20T12:00:00-03:00'), patientId: 'p-emma', occurredAt: '2026-08-20T11:00:00-03:00', modality: 'domicilio', visitType: 'control', status: 'realizada', addressId: 'ad-lucia',
      rawText: 'Control de 7 meses (5 y medio corregidos). Buen progreso de peso. Deposiciones con algo de moco: sospecha de APLV leve, en evaluación con dieta materna.' },
    { ...b('c-e2', '2026-09-22T12:00:00-03:00'), patientId: 'p-emma', occurredAt: '2026-09-22T10:00:00-03:00', modality: 'domicilio', visitType: 'control', status: 'realizada', addressId: 'ad-lucia',
      rawText: 'Sin moco en las deposiciones tras la dieta. Sostiene la cabeza, rola. Pautas de alimentación complementaria: purés de verduras de a uno.' },
    // Benjamín
    { ...b('c-b1', '2026-09-24T12:00:00-03:00'), patientId: 'p-benjamin', occurredAt: '2026-09-24T09:30:00-03:00', modality: 'domicilio', visitType: 'rn', status: 'realizada', addressId: 'ad-carolina',
      rawText: 'RN de 14 días. Recuperó el peso de nacimiento. Lactancia exclusiva, buen agarre. Ombligo caído. Pesquisa neonatal normal.' },
    { ...b('c-b2', consBenjaminAyer), patientId: 'p-benjamin', occurredAt: consBenjaminAyer, modality: 'telemedicina', visitType: 'urgencia-dia', status: 'realizada',
      rawText: 'La mamá refiere 38,1 rectal hace 2 horas. Toma bien el pecho, está activo. Menor de 3 meses con fiebre: indico consulta en guardia para evaluación.' },
    // Mateo
    { ...b('c-m1', consMateo), patientId: 'p-mateo', occurredAt: consMateo, modality: 'domicilio', visitType: 'seguimiento', status: 'realizada', addressId: 'ad-diego', appointmentId: 't-mateo',
      rawText: 'Seguimiento de neumonía. Afebril hace 24 h, tos en mejoría. Auscultación con rales escasos en base derecha. Completar antibiótico. Volver a ver si reaparece la fiebre.' },
    // Olivia
    { ...b('c-o1', '2026-05-14T12:00:00-03:00'), patientId: 'p-olivia', occurredAt: '2026-05-14T17:00:00-03:00', modality: 'domicilio', visitType: 'control', status: 'realizada', addressId: 'ad-paula', rawText: 'Control de 4 años y 10 meses. Todo en orden.' },
  ],

  measurements: [
    ...([
      ['2023-05-12', 3.4, 50, 34.5], ['2023-08-14', 6.2, 61, 40], ['2023-11-13', 7.9, 68, 43], ['2024-05-13', 9.6, 75.5, 46],
      ['2024-11-12', 11.0, 82, 47.5], ['2025-05-13', 12.3, 88, 48.5], ['2025-11-18', 13.6, 94, 49.2], ['2026-06-09', 14.8, 99, 49.8],
    ] as const).map(([d, w, h, hc], i) => ({ ...b(`me-t${i}`, `${d}T12:00:00-03:00`), patientId: 'p-tomas', consultationId: d === '2025-11-18' ? 'c-t1' : undefined, measuredAt: d, weightKg: w, heightCm: h, headCm: hc })),
    ...([
      ['2026-01-20', 2.15, 44, 31], ['2026-02-20', 2.9, 48, 33.5], ['2026-03-20', 3.9, 52, 36], ['2026-04-20', 4.9, 56, 38.5],
      ['2026-05-20', 5.8, 59.5, 40], ['2026-06-22', 6.5, 62, 41.2], ['2026-07-21', 7.1, 64.5, 42.3], ['2026-08-20', 7.6, 66.5, 43], ['2026-09-22', 8.0, 68, 43.8],
    ] as const).map(([d, w, h, hc], i) => ({ ...b(`me-e${i}`, `${d}T12:00:00-03:00`), patientId: 'p-emma', consultationId: d === '2026-08-20' ? 'c-e1' : d === '2026-09-22' ? 'c-e2' : undefined, measuredAt: d, weightKg: w, heightCm: h, headCm: hc })),
    ...([
      ['2026-09-10', 3.3, 50, 34.5], ['2026-09-24', 3.6, 52, 35.5], ['2026-10-08', 4.1, 54, 36.8],
    ] as const).map(([d, w, h, hc], i) => ({ ...b(`me-b${i}`, `${d}T12:00:00-03:00`), patientId: 'p-benjamin', consultationId: d === '2026-09-24' ? 'c-b1' : undefined, measuredAt: d, weightKg: w, heightCm: h, headCm: hc })),
    { ...b('me-o0', '2025-11-04T12:00:00-03:00'), patientId: 'p-olivia', measuredAt: '2025-11-04', weightKg: 18.2, heightCm: 108 },
    { ...b('me-o1', '2026-05-14T12:00:00-03:00'), patientId: 'p-olivia', consultationId: 'c-o1', measuredAt: '2026-05-14', weightKg: 19.4, heightCm: 111.5 },
  ],

  milestoneChecks: [],

  notes: [
    { ...b('n-t1', '2025-11-18T12:00:00-03:00'), consultationId: 'c-t1', patientId: 'p-tomas', version: 1, status: 'aprobada', origin: 'humano', clinicalFlag: false,
      findings: 'Come de todo, duerme bien. Frases de 3 palabras. Dermatitis en pliegues, mejor con emolientes. Soplo sistólico 1/6 en BEI, sin irradiación.',
      plan: 'Hidratación de la piel dos veces por día. Reevaluar soplo en el próximo control.',
      familySummary: 'Tomás está creciendo muy bien. Hablamos sobre la alimentación: puede comer de todo lo que come la familia. Seguimos con la crema hidratante para la piel dos veces por día.',
      allergiesMedication: 'Alérgico a amoxicilina.', updatedAt: '2025-11-18T18:00:00-03:00', approvedBy: DOCTOR_ID, approvedAt: '2025-11-18T18:00:00-03:00' },
    { ...b('n-t2-v1', '2026-06-09T20:30:00-03:00'), consultationId: 'c-t2', patientId: 'p-tomas', version: 1, status: 'reemplazada', origin: 'ia', clinicalFlag: true,
      findings: 'Otalgia derecha de 24 h, fiebre 38,4. Tímpano derecho abombado y eritematoso.', plan: 'Tratamiento indicado por mensaje. Control si persiste la fiebre a las 48 h.',
      familySummary: 'Tomás tiene una otitis en el oído derecho. Si sigue con fiebre en 48 horas, avisame.', allergiesMedication: 'Alérgico a amoxicilina.',
      updatedAt: '2026-06-09T21:00:00-03:00', approvedBy: DOCTOR_ID, approvedAt: '2026-06-09T21:00:00-03:00' },
    { ...b('n-t2-v2', '2026-06-10T09:15:00-03:00'), consultationId: 'c-t2', patientId: 'p-tomas', version: 2, previousVersionId: 'n-t2-v1', status: 'aprobada', origin: 'humano', clinicalFlag: true,
      findings: 'Otalgia derecha de 24 h, fiebre 38,4. Tímpano derecho abombado y eritematoso.', plan: 'Tratamiento indicado por mensaje. Control si persiste la fiebre a las 48-72 h o si está más decaído.',
      familySummary: 'Tomás tiene una otitis en el oído derecho. Si sigue con fiebre en 48 a 72 horas, o si lo ves más decaído, avisame y lo vuelvo a ver.', allergiesMedication: 'Alérgico a amoxicilina.',
      updatedAt: '2026-06-10T09:15:00-03:00', approvedBy: DOCTOR_ID, approvedAt: '2026-06-10T09:15:00-03:00' },
    { ...b('n-e1', '2026-08-20T12:00:00-03:00'), consultationId: 'c-e1', patientId: 'p-emma', version: 1, status: 'aprobada', origin: 'humano', clinicalFlag: false,
      findings: 'Buen progreso ponderal. Deposiciones con moco.', plan: 'Dieta materna sin lácteos por 4 semanas y reevaluar.',
      familySummary: 'Emma sigue sumando peso muy bien. Empezamos a hablar de la incorporación de alimentos para dentro de unas semanas, teniendo en cuenta su edad corregida.',
      allergiesMedication: 'Sospecha de APLV (referida).', updatedAt: '2026-08-20T19:00:00-03:00', approvedBy: DOCTOR_ID, approvedAt: '2026-08-20T19:00:00-03:00' },
    { ...b('n-e2', '2026-09-22T12:00:00-03:00'), consultationId: 'c-e2', patientId: 'p-emma', version: 1, status: 'borrador', origin: 'humano', clinicalFlag: false,
      findings: 'Sin moco en deposiciones tras la dieta. Sostiene la cabeza, rola.', plan: 'Alimentación complementaria: purés de verduras de a uno.',
      familySummary: 'Emma está muy bien. Ya podés empezar con purés de verduras de a uno por vez.', allergiesMedication: '', updatedAt: '2026-09-22T12:00:00-03:00' },
    { ...b('n-b1', '2026-09-24T12:00:00-03:00'), consultationId: 'c-b1', patientId: 'p-benjamin', version: 1, status: 'aprobada', origin: 'humano', clinicalFlag: false,
      findings: 'RN de 14 días. Recuperó el peso de nacimiento. Lactancia exclusiva con buen agarre. Ombligo caído.', plan: 'Lactancia a demanda. Sueño seguro.',
      familySummary: 'Primer control en casa. Benjamín ya recuperó el peso con el que nació y la lactancia va muy bien. Recordá ponerlo a dormir boca arriba, en su cuna y sin almohadas ni peluches.',
      allergiesMedication: '', updatedAt: '2026-09-24T15:00:00-03:00', approvedBy: DOCTOR_ID, approvedAt: '2026-09-24T15:00:00-03:00' },
    { ...b('n-b2', sumarHoras(consBenjaminAyer, 0.5)), consultationId: 'c-b2', patientId: 'p-benjamin', version: 1, status: 'aprobada', origin: 'ia', clinicalFlag: true,
      findings: 'Fiebre de 38,1 °C rectal referida. Toma bien el pecho, activo.', plan: 'Menor de 3 meses con fiebre: consulta en guardia para evaluación.',
      familySummary: 'Como Benjamín tiene menos de 3 meses y tuvo fiebre, lo tiene que ver un médico en la guardia hoy. Avisame cómo les fue.',
      allergiesMedication: '', updatedAt: sumarHoras(consBenjaminAyer, 0.5), approvedBy: DOCTOR_ID, approvedAt: sumarHoras(consBenjaminAyer, 0.5) },
    { ...b('n-m1', sumarHoras(consMateo, 1)), consultationId: 'c-m1', patientId: 'p-mateo', version: 1, status: 'aprobada', origin: 'humano', clinicalFlag: true,
      findings: 'Afebril hace 24 h, tos en mejoría. Rales escasos en base derecha.', plan: 'Completar antibiótico. Volver a ver si reaparece la fiebre.',
      familySummary: 'Mateo está mejorando. Completá el antibiótico como lo hablamos y avisame si vuelve la fiebre.',
      allergiesMedication: '', updatedAt: sumarHoras(consMateo, 1), approvedBy: DOCTOR_ID, approvedAt: sumarHoras(consMateo, 1) },
    { ...b('n-o1', '2026-05-14T18:00:00-03:00'), consultationId: 'c-o1', patientId: 'p-olivia', version: 1, status: 'aprobada', origin: 'humano', clinicalFlag: false,
      findings: 'Control de 4 años y 10 meses sin hallazgos.', plan: 'Próximo control antes del ingreso a primer grado.',
      familySummary: 'Control de los 4 años y 10 meses: todo en orden. Próximo control antes del ingreso a primer grado.', allergiesMedication: 'Alergia al maní (confirmada).',
      updatedAt: '2026-05-14T20:00:00-03:00', approvedBy: DOCTOR_ID, approvedAt: '2026-05-14T20:00:00-03:00' },
  ],

  followUps: [
    { ...b('fu-t2', '2026-06-10T09:15:00-03:00'), noteId: 'n-t2-v2', consultationId: 'c-t2', patientId: 'p-tomas', dueAt: '2026-06-10T19:00:00-03:00', status: 'resuelto', resolvedAt: '2026-06-11T10:00:00-03:00',
      message: '¿Cómo sigue Tomás con el oído?' },
    { ...b('fu-b2', sumarHoras(consBenjaminAyer, 0.5)), noteId: 'n-b2', consultationId: 'c-b2', patientId: 'p-benjamin', dueAt: sumarHoras(consBenjaminAyer, 24), status: 'pendiente',
      message: 'Hola, Carolina. Como Benjamín tiene menos de 3 meses y tuvo fiebre, lo tiene que ver un médico en la guardia hoy. Avisame cómo les fue.\n\nIndicaciones: Menor de 3 meses con fiebre: consulta en guardia para evaluación.' },
    { ...b('fu-m1', sumarHoras(consMateo, 1)), noteId: 'n-m1', consultationId: 'c-m1', patientId: 'p-mateo', dueAt: sumarHoras(consMateo, 48), status: 'pendiente',
      message: 'Hola, Diego. Mateo está mejorando. Completá el antibiótico como lo hablamos y avisame si vuelve la fiebre.\n\nIndicaciones: Completar antibiótico. Volver a ver si reaparece la fiebre.' },
  ],

  carePlan: [
    // Vacunas ya aplicadas: ítems del plan tildados como hechos.
    { ...b('cp-e1', '2026-09-22T12:00:00-03:00'), patientId: 'p-emma', category: 'control', description: 'Control de los 9 meses', targetDate: sumarDias(hoy, 5), done: false },
    { ...b('cp-e2', '2026-09-22T12:00:00-03:00'), patientId: 'p-emma', category: 'vacuna', description: 'Antigripal (2 dosis)', targetDate: sumarDias(hoy, 20), done: false },
    { ...b('cp-t1', '2025-11-18T12:00:00-03:00'), patientId: 'p-tomas', category: 'prevencion', description: 'Control odontológico', targetDate: '2026-11-30', done: false },
    { ...b('cp-t2', '2025-11-18T12:00:00-03:00'), patientId: 'p-tomas', category: 'otro', description: 'Ecocardiograma por soplo', targetDate: '2026-02-28', done: true, doneAt: '2026-02-20T10:00:00-03:00' },
  ],

  fever: [
    { ...b('fv-1', enDias(-2, '20:55'), 'g-lucia'), patientId: 'p-tomas', kind: 'toma', at: enDias(-2, '20:50'), temperatureC: 38.6, site: 'axilar', state: 'decaido', note: 'Comió poco en la cena.' },
    { ...b('fv-2', enDias(-2, '21:05'), 'g-lucia'), patientId: 'p-tomas', kind: 'antitermico', at: enDias(-2, '21:00'), drug: 'ibuprofeno', drugForm: '4%', dose: '7,5 ml' },
    { ...b('fv-3', enDias(-2, '23:05'), 'g-lucia'), patientId: 'p-tomas', kind: 'toma', at: enDias(-2, '23:00'), temperatureC: 37.6, site: 'axilar', state: 'animado', improvement: 'bien' },
    { ...b('fv-4', enDias(-1, '07:45'), 'g-martin'), patientId: 'p-tomas', kind: 'toma', at: enDias(-1, '07:40'), temperatureC: 37.4, site: 'axilar', state: 'animado' },
    { ...b('fv-5', enDias(-1, '13:10')), patientId: 'p-tomas', kind: 'toma', at: enDias(-1, '13:00'), temperatureC: 38.3, site: 'axilar', state: 'decaido', enteredByDoctor: true, note: 'Lo contó Lucía por teléfono.' },
    { ...b('fv-6', enDias(-1, '15:00'), 'g-lucia'), patientId: 'p-tomas', kind: 'antitermico', at: enDias(-1, '14:55'), drug: 'paracetamol', drugForm: 'jarabe', dose: '8 ml' },
    { ...b('fv-7', enDias(-1, '18:35'), 'g-carolina'), patientId: 'p-benjamin', kind: 'toma', at: enDias(-1, '18:30'), temperatureC: 38.1, site: 'rectal', state: 'animado',
      reviewedAt: sumarHoras(consBenjaminAyer, 0.5), reviewedBy: DOCTOR_ID, consultationId: 'c-b2' },
  ],

  certificates: [
    {
      ...b('cert-o1', '2026-05-14T18:10:00-03:00'), patientId: 'p-olivia', type: 'control-salud', date: '2026-05-14', place: 'Buenos Aires',
      body: textoCertificado({ nombre: 'Olivia Benítez', edad: '4 años y 10 meses', texto: tipoCertificado('control-salud').texto('F'), adulto: 'Paula Benítez', destino: 'la prepaga' }),
      requestedBy: 'Paula Benítez', destination: 'la prepaga', signature: FIRMA, status: 'emitido', documentId: 'doc-cert-o1',
    },
  ],
  documents: [
    { ...b('doc-cert-o1', '2026-05-14T18:10:00-03:00'), patientId: 'p-olivia', title: 'Constancia de control de salud', date: '2026-05-14', file: 'certificados/p-olivia/cert-o1.pdf', certificateId: 'cert-o1' },
    { ...b('doc-1', '2026-03-02T12:00:00-03:00'), patientId: 'p-tomas', title: 'Certificado de aptitud física (jardín)', date: '2026-03-02', file: 'documentos/p-tomas/apto-fisico-2026.pdf' },
  ],

  vaccineDoses: vacunasDeEjemplo,
  // Medicación, prescripciones y estudios de ejemplo (ficticios). La dosis la escribe el médico.
  medications: [],
  prescriptions: [],
  studies: [
    { ...b('es-mateo-1', consMateo), patientId: 'p-mateo', study: 'Radiografía de tórax', reason: 'Control de neumonía', orderedDate: consMateo.slice(0, 10), reviewDate: sumarDias(hoy, 2), status: 'resultado', resultNote: 'Llegó el informe; falta revisarlo.', consultationId: 'c-m1' },
  ],
  appointments: turnos,
  appointmentHistory: historial,
  blocks: [
    { ...b('bl-1', enDias(-5, '10:00')), desde: enDias(3, '13:00'), hasta: enDias(3, '20:00'), motivo: 'Curso de actualización' },
  ],
  communications: [],
  agenda: CONFIG_AGENDA_INICIAL,
  ia: { enabled: false },
  vacunas: { calendarioVerificado: false },

  auditLog: [
    { id: 'au-1', at: enDias(-2, '20:40'), actorId: 'g-lucia', action: 'login' },
    { id: 'au-2', at: enDias(-1, '07:35'), actorId: 'g-martin', action: 'login' },
    { id: 'au-3', at: enDias(-1, '18:25'), actorId: 'g-carolina', action: 'login' },
  ],
};

// Suma los pacientes extra (lista de unos 40 pacientes).
const extra = pacientesExtra();
export const datosDeEjemplo: Database = {
  ...base,
  families: [...base.families, ...extra.families],
  // Teléfonos guardados en E.164, como en Firestore.
  guardians: [...base.guardians, ...extra.guardians].map((g) => ({ ...g, phone: g.phone ? normalizarTelefono(g.phone) ?? g.phone : undefined })),
  addresses: [...base.addresses, ...extra.addresses],
  patients: [...base.patients, ...extra.patients],
  relationships: [...base.relationships, ...extra.relationships],
};
