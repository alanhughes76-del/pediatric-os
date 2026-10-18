/**
 * Reporte mensual (prompt maestro 7.17). Solo con datos reales del sistema: sin proyecciones.
 * Visitas = consultas realizadas en el mes. Membresías y pagos pendientes = situación al momento de
 * armar el reporte (no se reconstruye cómo estaban en meses pasados).
 */
import { estadoDosis } from '@shared/vacunas';
import type { Currency, Database, Patient, Payment, Scope, VisitType } from './types';
import { TEXTO_VISITA } from './selectores';
import { TEXTO_AMBITO } from '@/lib/busqueda';
import { contarMembresias, filasMembresias, pagosAConfirmar } from './membresias';
import { dinero } from './configuracion';

export interface ReporteMensual {
  /** "AAAA-MM" */
  mes: string;
  visitas: { total: number; porTipo: Record<VisitType, number>; porAmbito: Record<Scope, number> };
  /** Nombres de los ámbitos (Configuración). */
  ambitos: Record<Scope, string>;
  pacientesNuevos: Patient[];
  vacunas: { atrasadas: number; delMes: number; pacientes: number; calendarioVerificado: boolean };
  membresias: { activas: number; porRenovar: number; vencidas: number; suspendidas: number };
  pagos: { aConfirmar: Payment[]; cobrado: Partial<Record<Currency, number>>; cantidadCobrados: number };
}

const enMes = (fecha: string | undefined, mes: string) => !!fecha && fecha.slice(0, 7) === mes;
const ultimoDia = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

export function reporteMensual(db: Database, mes: string, hoy: string): ReporteMensual {
  const activos = db.patients.filter((p) => !p.archivedAt);
  const scopeDe = new Map(db.patients.map((p) => [p.id, p.scope]));

  const consultas = db.consultations.filter((c) => !c.archivedAt && c.status === 'realizada' && enMes(c.occurredAt, mes));
  const porTipo = Object.fromEntries(Object.keys(TEXTO_VISITA).map((k) => [k, 0])) as Record<VisitType, number>;
  const porAmbito = Object.fromEntries(Object.keys(TEXTO_AMBITO).map((k) => [k, 0])) as Record<Scope, number>;
  for (const c of consultas) {
    porTipo[c.visitType] = (porTipo[c.visitType] ?? 0) + 1;
    const s = scopeDe.get(c.patientId) ?? 'sin-asignar';
    porAmbito[s] = (porAmbito[s] ?? 0) + 1;
  }

  // Vacunas: las atrasadas hoy y las que vencen dentro del mes (de pacientes activos).
  const ids = new Set(activos.map((p) => p.id));
  const fin = ultimoDia(mes);
  const pendientes = db.vaccineDoses.filter((d) => !d.archivedAt && ids.has(d.patientId) && d.status === 'pendiente');
  const atrasadas = pendientes.filter((d) => estadoDosis(d, hoy) === 'atrasada');
  const delMes = pendientes.filter((d) => estadoDosis(d, hoy) === 'pendiente' && d.dueDate && d.dueDate.slice(0, 7) === mes && d.dueDate <= fin);

  const cuenta = contarMembresias(filasMembresias(db));
  const cobrados = db.payments.filter((p) => !p.archivedAt && (p.status ?? 'confirmado') === 'confirmado' && enMes(p.date, mes));
  const cobrado: Partial<Record<Currency, number>> = {};
  for (const p of cobrados) cobrado[p.currency] = (cobrado[p.currency] ?? 0) + p.amount;

  return {
    mes,
    visitas: { total: consultas.length, porTipo, porAmbito },
    ambitos: db.ambitos,
    pacientesNuevos: activos.filter((p) => enMes(p.createdAt, mes)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    vacunas: { atrasadas: atrasadas.length, delMes: delMes.length, pacientes: new Set([...atrasadas, ...delMes].map((d) => d.patientId)).size, calendarioVerificado: db.vacunas.calendarioVerificado },
    membresias: { activas: cuenta.activa, porRenovar: cuenta['por-vencer'], vencidas: cuenta.vencida, suspendidas: cuenta.suspendida },
    pagos: { aConfirmar: pagosAConfirmar(db), cobrado, cantidadCobrados: cobrados.length },
  };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "octubre de 2026" */
export const nombreMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
/** "2026-10" → "2026-09" (delta = -1). */
export function moverMes(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Renglones del reporte: [sección, concepto, valor]. Los usan la pantalla, el CSV y el PDF. */
export function filasReporte(r: ReporteMensual): [string, string, string][] {
  const filas: [string, string, string][] = [['Visitas', 'Total del mes', String(r.visitas.total)]];
  for (const [k, n] of Object.entries(r.visitas.porTipo)) if (n) filas.push(['Visitas por tipo', TEXTO_VISITA[k as VisitType] ?? k, String(n)]);
  for (const [k, n] of Object.entries(r.visitas.porAmbito)) if (n) filas.push(['Visitas por ámbito', r.ambitos[k as Scope] ?? k, String(n)]);
  filas.push(['Pacientes nuevos', 'Cantidad', String(r.pacientesNuevos.length)]);
  filas.push(['Vacunas pendientes', 'Dosis atrasadas', String(r.vacunas.atrasadas)]);
  filas.push(['Vacunas pendientes', 'Dosis que vencen en el mes', String(r.vacunas.delMes)]);
  filas.push(['Vacunas pendientes', 'Pacientes con alguna', String(r.vacunas.pacientes)]);
  if (!r.vacunas.calendarioVerificado) filas.push(['Vacunas pendientes', 'Aviso', 'Calendario sin verificar: fechas estimadas']);
  filas.push(['Membresías (hoy)', 'Activas', String(r.membresias.activas)]);
  filas.push(['Membresías (hoy)', 'Por renovar', String(r.membresias.porRenovar)]);
  filas.push(['Membresías (hoy)', 'Vencidas', String(r.membresias.vencidas)]);
  if (r.membresias.suspendidas) filas.push(['Membresías (hoy)', 'Suspendidas', String(r.membresias.suspendidas)]);
  filas.push(['Pagos', 'A confirmar (hoy)', String(r.pagos.aConfirmar.length)]);
  filas.push(['Pagos', 'Confirmados en el mes', String(r.pagos.cantidadCobrados)]);
  for (const [moneda, monto] of Object.entries(r.pagos.cobrado)) filas.push(['Pagos', `Cobrado en ${moneda}`, dinero(monto, moneda as Currency)]);
  return filas;
}

/** CSV con punto y coma (lo abre Excel en español sin mezclar columnas). */
export function csvReporte(r: ReporteMensual): string {
  const celda = (t: string) => (/[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
  const lineas = [['Sección', 'Concepto', 'Valor'], ...filasReporte(r)].map((f) => f.map(celda).join(';'));
  // BOM para que Excel respete los acentos.
  return `﻿${lineas.join('\r\n')}\r\n`;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** HTML del reporte para imprimir o pasar a PDF. Sin datos de pacientes: solo cantidades. */
export function htmlReporte(r: ReporteMensual, generado: string): string {
  const filas = filasReporte(r);
  let seccion = '';
  const cuerpo = filas.map(([s, c, v]) => {
    const titulo = s !== seccion ? `<tr><th colspan="2">${escapar(s)}</th></tr>` : '';
    seccion = s;
    return `${titulo}<tr><td>${escapar(c)}</td><td class="n">${escapar(v)}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte ${escapar(nombreMes(r.mes))}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: Inter, Helvetica, Arial, sans-serif; color: #1F2A44; font-size: 11pt; }
  h1 { font-size: 18pt; margin: 0; color: #1E2B4D; }
  p { color: #5A6478; margin: 4px 0 18px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; background: #F4F8FC; padding: 8px; font-size: 11pt; color: #1E2B4D; }
  td { padding: 6px 8px; border-bottom: 1px solid #E3E8EF; }
  .n { text-align: right; font-weight: 600; }
</style></head><body>
<h1>Reporte de ${escapar(nombreMes(r.mes))}</h1>
<p>Dr. Alan Hughes · Pediatría a domicilio · Generado el ${escapar(generado)}. Solo datos cargados en el sistema.</p>
<table>${cuerpo}</table>
</body></html>`;
}
