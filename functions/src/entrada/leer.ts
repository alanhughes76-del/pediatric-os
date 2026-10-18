/**
 * Lectura de lo que entra desde Make (prompt maestro 8.1, endpoints entrantes). Lógica pura, con tests.
 * Nunca se inventa un dato: lo que no se entiende queda vacío y lo completa el Dr.
 */
import { normalizar } from '../../../shared/duplicados';
import { normalizarTelefono } from '../../../shared/telefono';

export const TIPOS_ENTRADA = [
  'formulario.web',
  'tally.admision',
  'tally.triage_urgencia',
  'tally.feedback',
  'plaud.transcripcion',
  'telegram.pago',
  'mensajeria.estado',
  'mensajeria.entrante',
] as const;
export type TipoEntrada = (typeof TIPOS_ENTRADA)[number];
export const esTipoEntrada = (t: unknown): t is TipoEntrada => typeof t === 'string' && (TIPOS_ENTRADA as readonly string[]).includes(t);

type Obj = Record<string, unknown>;
export const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
export const texto = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '');

// ---------- Contacto (formulario web, Tally, mensajería) ----------

export interface Contacto { nombre: string; email: string; telefono: string | null }

export function leerContacto(d: Obj): Contacto {
  const email = texto(d.email, 200).toLowerCase();
  return {
    nombre: texto(d.nombre ?? d.name, 200),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
    telefono: normalizarTelefono(texto(d.telefono ?? d.phone, 40)) ?? null,
  };
}

/** Respuestas de un formulario (Tally): lista de { pregunta, respuesta } en texto, sin interpretar. */
export function leerRespuestas(v: unknown): { pregunta: string; respuesta: string }[] {
  if (Array.isArray(v)) {
    return v.map((x) => ({ pregunta: texto(obj(x).pregunta ?? obj(x).label, 300), respuesta: texto(obj(x).respuesta ?? obj(x).value, 2000) }))
      .filter((x) => x.pregunta || x.respuesta).slice(0, 60);
  }
  return Object.entries(obj(v)).map(([pregunta, r]) => ({ pregunta: pregunta.slice(0, 300), respuesta: texto(r, 2000) })).slice(0, 60);
}

// ---------- Pago por Telegram ("pago …") ----------

export interface PagoLeido {
  monto: number | null;
  moneda: 'ARS' | 'USD' | null;
  medio: 'efectivo' | 'transferencia' | 'mercadopago' | null;
  /** Lo que queda del mensaje (apellido, concepto…), para buscar la familia y como concepto. */
  resto: string;
}

/**
 * "pago 150.000 transferencia Ruiz", "pago usd 2000 efectivo Godoy membresía", "pago $90000 mp Sosa".
 * Si el mensaje trae los datos ya separados (Make), se usan esos.
 */
export function leerPagoTelegram(d: Obj): PagoLeido {
  const original = texto(d.texto ?? d.text, 500);
  let t = ` ${normalizar(original).replace(/^\s*pago\b/, '')} `;
  const montoDado = typeof d.monto === 'number' ? d.monto : null;

  let moneda: PagoLeido['moneda'] = null;
  if (/\b(usd|u\$s|us\$|dolares?|dolar)\b/.test(t) || /u\$s|us\$/.test(t)) moneda = 'USD';
  else if (/\b(ars|pesos?)\b/.test(t) || /\$/.test(t)) moneda = 'ARS';
  if (d.moneda === 'USD' || d.moneda === 'ARS') moneda = d.moneda;

  let medio: PagoLeido['medio'] = null;
  if (/\befectivo\b/.test(t)) medio = 'efectivo';
  else if (/\b(transferencia|transf)\b/.test(t)) medio = 'transferencia';
  else if (/\b(mercado ?pago|mp)\b/.test(t)) medio = 'mercadopago';
  if (d.medio === 'efectivo' || d.medio === 'transferencia' || d.medio === 'mercadopago') medio = d.medio;

  // Monto: el primer número ("150.000", "150000", "2.000,50", "2000").
  let monto = montoDado;
  const m = t.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)/);
  if (monto === null && m) monto = Number(m[1].replace(/\./g, '').replace(',', '.'));
  if (monto !== null && (!Number.isFinite(monto) || monto <= 0)) monto = null;

  t = t.replace(m?.[1] ?? '\u0000', ' ')
    .replace(/\b(usd|u\$s|us\$|dolares?|dolar|ars|pesos?|efectivo|transferencia|transf|mercado ?pago|mp)\b/g, ' ')
    .replace(/[$]/g, ' ');
  return { monto, moneda, medio, resto: t.replace(/\s+/g, ' ').trim() };
}

/** Familia por apellido: la única cuyo nombre contiene alguna palabra del mensaje (de 3 letras o más). */
export function familiaPorTexto(familias: { id: string; name: string }[], resto: string): string | null {
  const palabras = normalizar(resto).split(/\s+/).filter((p) => p.length >= 3);
  const coinciden = familias.filter((f) => {
    const nombre = normalizar(f.name).replace(/^familia\s+/, '').split(/\s+/);
    return palabras.some((p) => nombre.includes(p));
  });
  return coinciden.length === 1 ? coinciden[0].id : null;
}

// ---------- Plaud ----------

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Fechas de nacimiento dictadas ("nació el 12/05/2023", "fecha de nacimiento 12 de mayo de 2023"). */
export function fechasDeNacimiento(transcripcion: string): string[] {
  const t = normalizar(transcripcion);
  const fechas = new Set<string>();
  const cerca = /(naci[oó]|nacimiento|nacida|nacido|fn)\D{0,25}/g;
  for (const inicio of t.matchAll(cerca)) {
    const tramo = t.slice(inicio.index! , inicio.index! + 60);
    const num = tramo.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    const larga = tramo.match(/(\d{1,2}) de ([a-z]+) (?:de |del )?(\d{4})/);
    const [d, m, a] = num ? [Number(num[1]), Number(num[2]), Number(num[3])]
      : larga && MESES.includes(larga[2]) ? [Number(larga[1]), MESES.indexOf(larga[2]) + 1, Number(larga[3])] : [0, 0, 0];
    if (!a) continue;
    const fecha = new Date(Date.UTC(a, m - 1, d));
    if (fecha.getUTCDate() !== d || fecha.getUTCMonth() !== m - 1 || a < 1990) continue;
    fechas.add(fecha.toISOString().slice(0, 10));
  }
  return [...fechas];
}

export interface MedidasDictadas { weightKg?: number; heightCm?: number; headCm?: number }

const numero = (s: string) => Number(s.replace(',', '.'));

/**
 * Medidas dictadas: "peso 12,5 kg", "pesa 12500 gramos", "talla 85", "mide 85 cm", "PC 46", "perímetro cefálico 46,5".
 * Solo valores con un rango posible en pediatría; si hay dudas, no se propone nada.
 */
export function medidasDictadas(transcripcion: string): MedidasDictadas {
  const t = normalizar(transcripcion);
  const r: MedidasDictadas = {};
  const peso = t.match(/\b(?:peso|pesa)\D{0,12}(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|gramos?)?/);
  if (peso) {
    const v = numero(peso[1]);
    const unidad = peso[2] ?? '';
    const kg = /^(g|gr|gramos?)$/.test(unidad) || (!unidad && v > 200) ? v / 1000 : v;
    if (kg >= 0.4 && kg <= 150) r.weightKg = Math.round(kg * 1000) / 1000;
  }
  const talla = t.match(/\b(?:talla|mide|longitud|estatura)\D{0,12}(\d+(?:[.,]\d+)?)\s*(cm|centimetros?|m|metros?)?/);
  if (talla) {
    const v = numero(talla[1]);
    const unidadT = talla[2] ?? '';
    const cm = /^(m|metros?)$/.test(unidadT) || (!unidadT && v < 3) ? v * 100 : v;
    if (cm >= 30 && cm <= 210) r.heightCm = Math.round(cm * 10) / 10;
  }
  const pc = t.match(/\b(?:pc|perimetro cefalico|perimetro de cabeza|cefalico)\D{0,12}(\d+(?:[.,]\d+)?)/);
  if (pc) {
    const v = numero(pc[1]);
    if (v >= 20 && v <= 65) r.headCm = v;
  }
  return r;
}

// ---------- Estado de entrega ----------

export type EstadoEntrega = 'entregado' | 'fallido' | 'enviado_a_make';

export function leerEstado(v: unknown): EstadoEntrega | null {
  const s = normalizar(texto(v, 40));
  if (['entregado', 'delivered', 'read', 'leido'].includes(s)) return 'entregado';
  if (['fallido', 'failed', 'undelivered', 'error'].includes(s)) return 'fallido';
  if (['enviado', 'sent', 'queued', 'accepted'].includes(s)) return 'enviado_a_make';
  return null;
}
