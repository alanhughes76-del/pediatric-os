/**
 * Cloud Functions de Pediatric OS: roles, auditoría, acceso al portal, outbox, pacientes, notas,
 * certificados y turnos (con el endpoint de Cal.com). Lo que falta (portal, IA…) llega en sus etapas.
 */
export { asignarRol } from './roles';
export { crearPaciente } from './pacientes';
export { aprobarNota, corregirNota } from './notas';
export { emitirCertificado, anularCertificado } from './certificados';
export { crearTurno, accionTurno } from './turnos/callables';
export { enviarResumenFamilia } from './resumen';
export { enviarMaterial } from './prevencion';
export { reservaCalcom } from './turnos/endpoint';
export { auditarAdministrativo, auditarClinico, auditarDomicilios } from './auditoria/triggers';
export { accesoPorAdulto, accesoPorVinculo } from './acceso/triggers';
export { despacharEvento, reintentarEventos } from './outbox/triggers';
