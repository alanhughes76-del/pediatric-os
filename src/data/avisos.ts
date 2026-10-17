/**
 * Avisos del médico (la campana y la pestaña "Avisos"). Salen solo de datos reales del sistema;
 * no hay indicadores inventados (prompt maestro 7.1). Los avisos de estudios, vacunas atrasadas
 * y pagos vencidos se suman cuando existan esos módulos (Etapas 5 y 7).
 */
import type { Href } from 'expo-router';
import type { Database } from './types';
import { fiebreDe, membresiaDeFamilia, nombreCompleto, seguimientosPendientes, sinRevisar } from './selectores';
import { fechaCorta } from '@/lib/fechas';

export type TipoAviso = 'seguimiento' | 'fiebre' | 'membresia';

export interface Aviso {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  detalle: string;
  /** Rojo, con ícono y palabra: vencido. */
  alerta: boolean;
  href: Href;
}

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

  for (const fam of db.families.filter((x) => !x.archivedAt)) {
    const { estado, membership, diasRestantes } = membresiaDeFamilia(db, fam.id);
    if (!membership || (estado !== 'por-vencer' && estado !== 'vencida')) continue;
    avisos.push({
      id: `mem-${membership.id}`, tipo: 'membresia', alerta: estado === 'vencida',
      titulo: `${estado === 'vencida' ? 'Membresía vencida' : 'Membresía por renovar'} · ${fam.name}`,
      detalle: estado === 'vencida'
        ? `Venció el ${fechaCorta(membership.renewalDate)}`
        : `Se renueva el ${fechaCorta(membership.renewalDate)} (en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'})`,
      href: '/medico/membresias',
    });
  }

  return avisos;
}
