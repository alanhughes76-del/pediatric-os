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

/*
 * Catálogo de eventos (prompt maestro 8.1): para quién es cada uno y qué plantilla de mensaje usa Make.
 * - familia: Make le escribe a la familia (por eso el evento lleva destinatarios con email y teléfono E.164).
 * - medico: aviso interno del Dr. (Telegram). Lleva el contacto de la familia para el puente de respuestas.
 * - sistema: solo para mantener sincronizado lo que Make todavía lee (por ejemplo, Notion).
 * Las plantillas son las que el Dr. ya tiene nombradas; las que faltan quedan sin plantilla hasta que él
 * las cree y apruebe (docs/AUTOMATIZACIONES.md). Ningún aviso automático lleva información clínica, salvo
 * `resumen.envio_aprobado` (el resumen que aprobó el Dr.).
 */

export type Audiencia = 'familia' | 'medico' | 'sistema';

export interface Definicion {
  audiencia: Audiencia;
  plantilla?: string;
  /** Para la pantalla de Configuración y la documentación. */
  descripcion: string;
  /** Lo emite una función programada (no una acción). */
  programado?: boolean;
}

export const CATALOGO: Record<TipoEvento, Definicion> = {
  'turno.solicitado': { audiencia: 'medico', descripcion: 'Una familia pidió una visita (portal o Cal.com)' },
  'turno.confirmado': { audiencia: 'familia', plantilla: 'confirmacion_turno', descripcion: 'Confirmaste un turno' },
  'turno.reprogramado': { audiencia: 'familia', descripcion: 'Cambió el horario de un turno confirmado' },
  'turno.cancelado': { audiencia: 'familia', descripcion: 'Se canceló un turno' },
  'turno.en_camino': { audiencia: 'familia', descripcion: 'Marcaste "Estoy en camino"' },
  'turno.recordatorio_24h': { audiencia: 'familia', descripcion: 'Recordatorio 24 horas antes de un turno confirmado', programado: true },
  'paciente.creado': { audiencia: 'sistema', descripcion: 'Alta de un paciente' },
  'familia.creada': { audiencia: 'sistema', descripcion: 'Alta de una familia' },
  'familia.datos_actualizados': { audiencia: 'medico', descripcion: 'Una familia cambió su contacto o sus direcciones' },
  'nota.aprobada': { audiencia: 'sistema', descripcion: 'Aprobaste una nota (sin contenido clínico)' },
  'resumen.envio_aprobado': { audiencia: 'familia', plantilla: 'resumen_visita', descripcion: 'El resumen de la visita que aprobaste (el único con texto clínico)' },
  'seguimiento.creado': { audiencia: 'medico', descripcion: 'Quedó un seguimiento pendiente' },
  'seguimiento.vencido': { audiencia: 'medico', descripcion: 'Un seguimiento venció sin hacerse', programado: true },
  'vacuna.proxima': { audiencia: 'familia', descripcion: 'Una vacuna vence en los próximos 14 días (solo con el calendario verificado)', programado: true },
  'vacuna.atrasada': { audiencia: 'familia', descripcion: 'Una vacuna quedó atrasada (solo con el calendario verificado)', programado: true },
  'estudio.revisar_resultado': { audiencia: 'medico', descripcion: 'Llegó el día de revisar un resultado', programado: true },
  'membresia.alta': { audiencia: 'familia', plantilla: 'bienvenida_membresia', descripcion: 'Bienvenida a una familia con membresía nueva' },
  'membresia.por_renovar': { audiencia: 'familia', plantilla: 'aviso_renovacion_membresia', descripcion: 'La membresía se renueva en 30 días o menos (se repite a los 20 días)', programado: true },
  'pago.vencido': { audiencia: 'medico', descripcion: 'Una membresía lleva 15 días vencida sin pago nuevo', programado: true },
  'control.proximo': { audiencia: 'familia', descripcion: 'Un control del plan de cuidado es en los próximos 7 días', programado: true },
  'certificado.emitido': { audiencia: 'familia', descripcion: 'Emitiste un certificado (el PDF va por mail, nunca por mensaje)' },
  'material.enviado': { audiencia: 'familia', descripcion: 'Le mandaste un material a una familia' },
  'fiebre.registro_nuevo': { audiencia: 'medico', descripcion: 'Una familia anotó una temperatura o un antitérmico' },
};

