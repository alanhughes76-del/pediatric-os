/**
 * Eventos que Pediatric OS manda a Make (sección 8.1 del prompt maestro).
 * Cada evento lleva solo el mínimo de datos para su envío. El único con texto clínico es
 * `resumen.envio_aprobado` (el resumen para la familia que aprobó el Dr.).
 */
export const TIPOS_EVENTO = [
  'turno.solicitado',
  'turno.confirmado',
  'turno.reprogramado',
  'turno.cancelado',
  'turno.en_camino',
  'turno.recordatorio_24h',
  'paciente.creado',
  'familia.creada',
  'familia.datos_actualizados',
  'nota.aprobada',
  'resumen.envio_aprobado',
  'seguimiento.creado',
  'seguimiento.vencido',
  'vacuna.proxima',
  'vacuna.atrasada',
  'estudio.revisar_resultado',
  'membresia.alta',
  'membresia.por_renovar',
  'pago.vencido',
  'control.proximo',
  'certificado.emitido',
  'material.enviado',
  'fiebre.registro_nuevo',
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const esTipoEvento = (t: string): t is TipoEvento => (TIPOS_EVENTO as readonly string[]).includes(t);
