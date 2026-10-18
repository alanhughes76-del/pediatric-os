/**
 * Arma el pedido de cada acción con los datos del paciente, llama al modelo y valida la respuesta.
 * Sin Firebase: los datos y el modelo se inyectan (tests en tests/funciones/ia.test.ts).
 */
import { INSTRUCCIONES, ESQUEMAS, SISTEMA, normalizarResultado, type AccionIA } from './acciones';
import { contextoBiblioteca, contextoConsulta, contextoHistoria, lineasEstudios, encabezado, type DatosPaciente } from './contexto';
import type { Modelo } from './modelo';

type Datos = Record<string, unknown>;

export interface PedidoIA { accion: AccionIA; consulta?: Datos; pregunta?: string }
export interface ResultadoIA {
  estado: 'ok' | 'rechazo' | 'incompleta' | 'error' | 'sin_datos';
  resultado?: Datos;
  error?: string;
  modelo?: string;
  tokensEntrada?: number;
  tokensSalida?: number;
}

export function armarPedido(p: PedidoIA, d: DatosPaciente & { materiales?: Datos[] }, hoy: string): string | null {
  switch (p.accion) {
    case 'preparar_evolucion': {
      const texto = typeof p.consulta?.rawText === 'string' ? p.consulta.rawText.trim() : '';
      if (texto.length < 10) return null;
      return `${INSTRUCCIONES.preparar_evolucion}\n\n${contextoConsulta(d, p.consulta!, hoy)}`;
    }
    case 'sugerir_material':
      return `${INSTRUCCIONES.sugerir_material}\n\n${contextoHistoria(d, hoy)}\n\n${contextoBiblioteca(d.materiales ?? [])}`;
    case 'revisar_estudios':
      return `${INSTRUCCIONES.revisar_estudios}\n\n${encabezado(d.paciente, hoy)}\n${lineasEstudios(d.estudios ?? []).join('\n')}`;
    case 'consulta_libre': {
      const pregunta = (p.pregunta ?? '').trim();
      if (!pregunta) return null;
      return `${INSTRUCCIONES.consulta_libre}\n\nPREGUNTA DEL PEDIATRA: ${pregunta}\n\n${contextoHistoria(d, hoy)}`;
    }
    case 'resumir_historia':
      return `${INSTRUCCIONES.resumir_historia}\n\n${contextoHistoria(d, hoy)}`;
  }
}

export async function ejecutarAccion(p: PedidoIA, d: DatosPaciente & { materiales?: Datos[] }, modelo: Modelo, hoy: string): Promise<ResultadoIA> {
  const usuario = armarPedido(p, d, hoy);
  if (!usuario) {
    return {
      estado: 'sin_datos',
      error: p.accion === 'preparar_evolucion' ? 'Primero escribí, pegá o dictá el texto de la consulta.' : 'Escribí la pregunta.',
    };
  }
  const r = await modelo({ sistema: SISTEMA, usuario, esquema: ESQUEMAS[p.accion] });
  const base = { modelo: r.modelo, tokensEntrada: r.tokensEntrada, tokensSalida: r.tokensSalida };
  if (r.estado === 'rechazo') return { ...base, estado: 'rechazo', error: 'La IA no quiso responder a este pedido. Escribilo vos.' };
  if (r.estado === 'incompleta') return { ...base, estado: 'incompleta', error: 'La respuesta de la IA llegó incompleta. Probá de nuevo.' };
  if (r.estado === 'error') return { ...base, estado: 'error', error: r.error };
  const resultado = normalizarResultado(p.accion, r.json, {
    materiales: (d.materiales ?? []).filter((m) => !m.archivedAt).map((m) => String(m.id)),
    estudios: (d.estudios ?? []).filter((e) => !e.archivedAt).map((e) => String(e.id)),
  });
  if (!resultado) return { ...base, estado: 'incompleta', error: 'La respuesta de la IA no tuvo la forma esperada. Probá de nuevo.' };
  return { ...base, estado: 'ok', resultado };
}
