/**
 * A quién le escribe Make: los adultos responsables con vínculo vigente (o los de la familia), con el
 * mínimo para el envío: nombre, email, teléfono en E.164 y cómo prefieren el contacto.
 * También el nombre de pila de los chicos, para que el mensaje los nombre. Nada clínico.
 */
import { db, hoyArgentina } from '../config';

export interface Destinatario { guardianId: string; nombre: string; email: string | null; telefono: string | null; preferencia: string | null }
export interface PacienteDelEvento { patientId: string; nombre: string }

type Datos = Record<string, unknown>;

const comoDestinatario = (id: string, g: Datos): Destinatario => ({
  guardianId: id,
  nombre: String(g.firstName ?? ''),
  email: typeof g.email === 'string' && g.email.trim() ? g.email.trim() : null,
  // Los teléfonos se guardan en E.164 (reglas y servidor).
  telefono: typeof g.phone === 'string' && g.phone.startsWith('+') ? g.phone : null,
  preferencia: typeof g.contactPreference === 'string' ? g.contactPreference : null,
});

/** Pacientes y familia que nombra el evento: `patientId`, `patientIds` o `familyId`. */
export async function contactosDelEvento(org: string, data: Datos): Promise<{ pacientes: PacienteDelEvento[]; destinatarios: Destinatario[] }> {
  const base = `organizations/${org}`;
  const ids = [...new Set([
    ...(typeof data.patientId === 'string' ? [data.patientId] : []),
    ...(Array.isArray(data.patientIds) ? data.patientIds.filter((x): x is string => typeof x === 'string') : []),
  ])];
  const pacientes: PacienteDelEvento[] = [];
  const adultos = new Map<string, Destinatario>();
  const hoy = hoyArgentina();

  for (const pid of ids) {
    const p = (await db().doc(`${base}/patients/${pid}`).get()).data();
    if (p) pacientes.push({ patientId: pid, nombre: String(p.firstName ?? '') });
    const vinculos = await db().collection(`${base}/relationships`).where('patientId', '==', pid).get();
    for (const v of vinculos.docs.map((x) => x.data())) {
      if (v.archivedAt || (v.validTo && v.validTo <= hoy) || adultos.has(v.guardianId)) continue;
      const g = await db().doc(`${base}/guardians/${v.guardianId}`).get();
      if (g.exists && !g.data()?.archivedAt) adultos.set(g.id, comoDestinatario(g.id, g.data()!));
    }
  }
  // Sin chicos (por ejemplo, la bienvenida de una membresía): los adultos de la familia.
  if (adultos.size === 0 && typeof data.familyId === 'string') {
    const gs = await db().collection(`${base}/guardians`).where('familyId', '==', data.familyId).get();
    for (const g of gs.docs) if (!g.data().archivedAt) adultos.set(g.id, comoDestinatario(g.id, g.data()));
  }
  return { pacientes, destinatarios: [...adultos.values()] };
}
