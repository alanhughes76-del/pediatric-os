/**
 * Cloud Functions de Pediatric OS (Etapa 1a: roles, auditoría, acceso al portal y outbox).
 * Lo que falta (turnos, notas, certificados, endpoints entrantes, IA) llega en sus etapas.
 */
export { asignarRol } from './roles';
export { auditarAdministrativo, auditarClinico, auditarDomicilios } from './auditoria/triggers';
export { accesoPorAdulto, accesoPorVinculo } from './acceso/triggers';
export { despacharEvento, reintentarEventos } from './outbox/triggers';
