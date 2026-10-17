/**
 * Alta de pacientes en el servidor, con el control de duplicados de la regla 8
 * (la misma lógica que la pantalla: shared/duplicados.ts). Las reglas no dejan crear
 * pacientes desde la app: el alta pasa siempre por acá.
 *
 * - Mismo DNI: rechaza (`already-exists`) y devuelve el paciente existente.
 * - Mismo apellido y fecha de nacimiento: devuelve los posibles duplicados; se guarda
 *   solo si el médico confirma que es otro paciente (`confirmarPosibleDuplicado`).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { esquemaPara } from '../../shared/vacunas';
import { db } from './config';
import { buscarDuplicados, normalizar, soloDigitos } from '../../shared/duplicados';
import { isoArgentina } from '../../shared/fechaHora';

const SEXOS = ['M', 'F', 'X'];
const AMBITOS = ['membresia', 'cardales', 'hepta', 'esporadico', 'sin-asignar'];
const COBERTURAS = ['prepaga', 'obra-social', 'particular'];
const GRUPOS = ['0+', '0-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export interface PedidoAlta {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: string;
  dni?: string;
  scope?: string;
  gestationalWeeks?: number;
  familyId?: string;
  coverage?: { kind?: string; name?: string; memberNumber?: string };
  bloodType?: string;
  confirmarPosibleDuplicado?: boolean;
}

export const crearPaciente = onCall<PedidoAlta>(async (req) => {
  const t = req.auth?.token;
  if (!t || !['medico', 'asistente'].includes(t.rol) || typeof t.organizationId !== 'string') {
    throw new HttpsError('permission-denied', 'Solo el equipo puede dar de alta pacientes.');
  }
  const d = req.data ?? {};
  const firstName = d.firstName?.trim();
  const lastName = d.lastName?.trim();
  if (!firstName || !lastName) throw new HttpsError('invalid-argument', 'Faltan el nombre o el apellido.');
  if (!d.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) || d.birthDate > isoArgentina().slice(0, 10)) {
    throw new HttpsError('invalid-argument', 'La fecha de nacimiento no es válida.');
  }
  if (!d.sex || !SEXOS.includes(d.sex)) throw new HttpsError('invalid-argument', 'Elegí el sexo (M, F o X).');
  const scope = d.scope ?? 'sin-asignar';
  if (!AMBITOS.includes(scope)) throw new HttpsError('invalid-argument', 'El ámbito no es válido.');
  if (d.gestationalWeeks != null && !(Number.isInteger(d.gestationalWeeks) && d.gestationalWeeks >= 22 && d.gestationalWeeks <= 44)) {
    throw new HttpsError('invalid-argument', 'La edad gestacional tiene que estar entre 22 y 44 semanas.');
  }

  if (d.coverage && !COBERTURAS.includes(String(d.coverage.kind))) throw new HttpsError('invalid-argument', 'La cobertura no es válida.');
  if (d.bloodType != null && !GRUPOS.includes(d.bloodType)) throw new HttpsError('invalid-argument', 'El grupo sanguíneo no es válido.');

  const org = db().collection(`organizations/${t.organizationId}/patients`);
  const dniDigits = soloDigitos(d.dni);
  const lastNameNorm = normalizar(lastName);

  const [porDni, porApellido] = await Promise.all([
    dniDigits ? org.where('dniDigits', '==', dniDigits).get() : Promise.resolve(null),
    org.where('lastNameNorm', '==', lastNameNorm).where('birthDate', '==', d.birthDate).get(),
  ]);
  const candidatos = [...(porDni?.docs ?? []), ...porApellido.docs].map((x) => ({ id: x.id, ...(x.data() as { lastName: string; firstName: string; birthDate: string; dni?: string; archivedAt?: string }) }));
  const r = buscarDuplicados(candidatos, { lastName, birthDate: d.birthDate, dni: d.dni });
  const resumen = (p: { id: string; firstName: string; lastName: string; birthDate: string }) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, birthDate: p.birthDate });

  if (r.mismoDni.length > 0) {
    throw new HttpsError('already-exists', 'Ya hay un paciente con ese DNI.', { existente: resumen(r.mismoDni[0]) });
  }
  if (r.posibles.length > 0 && !d.confirmarPosibleDuplicado) {
    return { estado: 'posible-duplicado' as const, posibles: r.posibles.map(resumen) };
  }

  const ahora = isoArgentina();
  const ref = await org.add({
    organizationId: t.organizationId,
    firstName, lastName, lastNameNorm,
    birthDate: d.birthDate,
    sex: d.sex,
    scope,
    status: 'activo',
    ...(dniDigits ? { dni: d.dni!.trim(), dniDigits } : {}),
    ...(d.gestationalWeeks != null ? { gestationalWeeks: d.gestationalWeeks } : {}),
    ...(d.familyId ? { familyId: d.familyId } : {}),
    ...(d.coverage ? { coverage: Object.fromEntries(Object.entries({ kind: d.coverage.kind, name: d.coverage.name?.trim(), memberNumber: d.coverage.memberNumber?.trim() }).filter(([, v]) => v)) } : {}),
    ...(d.bloodType ? { bloodType: d.bloodType } : {}),
    createdBy: req.auth!.uid, createdAt: ahora, updatedBy: req.auth!.uid, updatedAt: ahora,
  });

  // Esquema de vacunas según el calendario (prompt maestro 7.8). El calendario es un borrador
  // hasta que el Dr. lo verifique: las dosis se generan igual, pero no salen recordatorios.
  const lote = db().batch();
  for (const v of esquemaPara(d.birthDate)) {
    lote.set(db().doc(`organizations/${t.organizationId}/clinical/${ref.id}/vaccineDoses/vd-${ref.id}-${v.clave}`), {
      organizationId: t.organizationId, patientId: ref.id, vaccine: v.vaccine, dose: v.dose, ageText: v.ageText,
      ageMonths: v.ageMonths, dueDate: v.dueDate, status: 'pendiente', source: 'calendario',
      createdBy: req.auth!.uid, createdAt: ahora, updatedBy: req.auth!.uid, updatedAt: ahora,
    });
  }
  await lote.commit();
  return { estado: 'creado' as const, id: ref.id };
});
