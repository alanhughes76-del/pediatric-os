/**
 * Avisos del médico (la campana y la pestaña "Avisos"). Salen solo de datos reales del sistema;
 * no hay indicadores inventados (prompt maestro 7.1). Los pagos vencidos se suman en la Etapa 7.
 */
import type { Href } from 'expo-router';
import type { Database } from './types';
import { pagosAConfirmar } from './membresias';
import { dinero } from './configuracion';
import { fiebreDe, membresiaDeFamilia, nombreCompleto, seguimientosPendientes, sinRevisar } from './selectores';
import { fechaCorta, hoyISO } from '@/lib/fechas';
import { estadoDosis } from '@shared/vacunas';
import { resultadosSinRevisar } from './seguimientoClinico';

export type TipoAviso = 'seguimiento' | 'fiebre' | 'estudio' | 'vacuna' | 'membresia' | 'datos' | 'plaud' | 'triage' | 'interesado';

export interface Aviso {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  detalle: string;
  /** Rojo, con ícono y palabra: vencido. */
  alerta: boolean;
  href: Href;
  /** Si sale de un aviso guardado (campana del servidor): al abrirlo se marca visto. */
  notificacionId?: string;
}

const CAMPO: Record<string, string> = { phone: 'teléfono', email: 'email', contactPreference: 'preferencia de contacto', direccion: 'dirección' };

export function avisosDelMedico(db: Database, ahora = new Date().toISOString()): Aviso[] {
  const avisos: Aviso[] = [];

  for (const f of seguimientosPendientes(db)) {
    if (f.dueAt >= ahora) continue;
    const p = db.patients.find((x) => x.id === f.patientId);
    avisos.push({
      id: `seg-${f.id}`, tipo: 'seguimiento', alerta: true,
      titulo: `Seguimiento vencido · ${p ? nombreCompleto(p) : 'Paciente'}`,
      detalle: `Vencía el ${fechaCorta(f.dueAt)}`,
      href: `/medico/seguimiento/${f.id}`,
    });
  }

  for (const p of db.patients.filter((x) => !x.archivedAt)) {
    const n = fiebreDe(db, p.id).filter(sinRevisar).length;
    if (n === 0) continue;
    avisos.push({
      id: `fie-${p.id}`, tipo: 'fiebre', alerta: false,
      titulo: `Fiebre sin revisar · ${nombreCompleto(p)}`,
      detalle: `${n} ${n === 1 ? 'registro' : 'registros'}`,
      href: `/medico/fiebre/${p.id}`,
    });
  }

  const hoy = hoyISO();
  for (const { estudio: e, paciente: p, vencido } of resultadosSinRevisar(db, hoy)) {
    avisos.push({
      id: `est-${e.id}`, tipo: 'estudio', alerta: vencido,
      titulo: `Resultado para revisar · ${nombreCompleto(p)}`,
      detalle: `${e.study}${e.reviewDate ? ` · ${vencido ? 'había que revisarlo el' : 'revisar el'} ${fechaCorta(e.reviewDate)}` : ''}`,
      href: { pathname: '/medico/hijo/[id]', params: { id: p.id, solapa: 'estudios' } },
    });
  }

  // Vacunas atrasadas según el calendario (si no está verificado, se aclara).
  for (const p of db.patients.filter((x) => !x.archivedAt)) {
    const atrasadas = db.vaccineDoses.filter((d) => d.patientId === p.id && !d.archivedAt && estadoDosis(d, hoy) === 'atrasada');
    if (atrasadas.length === 0) continue;
    avisos.push({
      id: `vac-${p.id}`, tipo: 'vacuna', alerta: false,
      titulo: `Vacunas atrasadas · ${nombreCompleto(p)}`,
      detalle: `${atrasadas.length} ${atrasadas.length === 1 ? 'dosis' : 'dosis'}${db.vacunas.calendarioVerificado ? '' : ' (calendario sin verificar)'}`,
      href: { pathname: '/medico/hijo/[id]', params: { id: p.id, solapa: 'vacunas' } },
    });
  }

  // Lo que entró desde Make y espera al Dr. (Etapa 8b). Queda hasta que lo atiende.
  for (const t of db.transcripciones.filter((x) => x.estado === 'pendiente' && !x.archivedAt)) {
    const sugerido = t.pacientesSugeridos.length === 1 ? db.patients.find((p) => p.id === t.pacientesSugeridos[0]) : undefined;
    avisos.push({
      id: `plaud-${t.id}`, tipo: 'plaud', alerta: false,
      titulo: `Transcripción de Plaud para revisar${sugerido ? ` · ${nombreCompleto(sugerido)}` : ''}`,
      detalle: `Grabada el ${fechaCorta(t.grabadaAt)}${t.pacientesSugeridos.length > 1 ? ` · ${t.pacientesSugeridos.length} pacientes posibles` : t.pacientesSugeridos.length === 0 ? ' · elegí el paciente' : ''}`,
      href: { pathname: '/medico/plaud/[id]', params: { id: t.id } },
    });
  }
  for (const t of db.triage.filter((x) => !x.revisadoAt && !x.archivedAt)) {
    const familia = db.families.find((f) => f.id === t.familyId)?.name ?? (t.contacto.nombre || 'Contacto sin identificar');
    avisos.push({
      id: `triage-${t.id}`, tipo: 'triage', alerta: true,
      titulo: `Triage de urgencia · ${familia}`,
      detalle: t.appointmentId ? 'Adjunto a la solicitud de urgencia' : 'Sin solicitud de urgencia asociada',
      href: { pathname: '/medico/triage/[id]', params: { id: t.id } },
    });
  }
  for (const i of db.interesados.filter((x) => x.estado === 'nuevo' && !x.archivedAt)) {
    avisos.push({
      id: `int-${i.id}`, tipo: 'interesado', alerta: false,
      titulo: `${i.origen === 'web' ? 'Consulta por la web' : 'Formulario de admisión'} · ${i.nombre || 'sin nombre'}`,
      detalle: `Recibida el ${fechaCorta(i.recibidoAt)}${i.zona ? ` · ${i.zona}` : ''}`,
      href: '/medico/interesados',
    });
  }

  // Una familia cambió sus datos desde el portal.
  for (const n of db.notifications.filter((x) => !x.readAt && x.kind === 'datos_familia')) {
    avisos.push({
      id: `dat-${n.id}`, tipo: 'datos', alerta: false, notificacionId: n.id,
      titulo: `Datos actualizados · ${n.titulo ?? 'Una familia'}`,
      detalle: `Cambió: ${(n.campos ?? []).map((c) => CAMPO[c] ?? c).join(', ') || 'sus datos'}`,
      href: n.guardianId ? `/medico/adulto/${n.guardianId}` : '/medico/familias',
    });
  }

  for (const fam of db.families.filter((x) => !x.archivedAt)) {
    const { estado, membership, diasRestantes } = membresiaDeFamilia(db, fam.id);
    if (!membership || (estado !== 'por-vencer' && estado !== 'vencida')) continue;
    avisos.push({
      id: `mem-${membership.id}`, tipo: 'membresia', alerta: estado === 'vencida',
      titulo: `${estado === 'vencida' ? 'Membresía vencida' : 'Membresía por renovar'} · ${fam.name}`,
      detalle: estado === 'vencida'
        ? `Venció el ${fechaCorta(membership.renewalDate)}`
        : `Se renueva el ${fechaCorta(membership.renewalDate)} (en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'})`,
      href: `/medico/familia/${fam.id}`,
    });
  }

  // Pagos que llegaron por una automatización y falta confirmar.
  const pendientes = pagosAConfirmar(db);
  if (pendientes.length > 0) {
    avisos.push({
      id: 'pagos-a-confirmar', tipo: 'membresia', alerta: false,
      titulo: `${pendientes.length === 1 ? 'Un pago' : `${pendientes.length} pagos`} para confirmar`,
      detalle: pendientes.map((p) => `${fechaCorta(p.date)} · ${dinero(p.amount, p.currency)}`).join(' · '),
      href: '/medico/membresias',
    });
  }

  return avisos;
}
