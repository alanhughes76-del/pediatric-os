/**
 * Cloud Functions de Pediatric OS: roles, auditoría, acceso al portal, outbox, pacientes, notas,
 * certificados, turnos (con el endpoint de Cal.com), portal y los eventos para Make (también los programados).
 */
export { asignarRol } from './roles';
export { crearPaciente } from './pacientes';
export { aprobarNota, corregirNota } from './notas';
export { emitirCertificado, anularCertificado } from './certificados';
export { crearTurno, accionTurno } from './turnos/callables';
export { enviarResumenFamilia } from './resumen';
export { enviarMaterial } from './prevencion';
export { pedirEnlace, entrarConEnlace } from './portal/enlace';
export { pedirVisita, avisoDatosFamilia, avisoDireccionFamilia } from './portal/familia';
export { reservaCalcom } from './turnos/endpoint';
export { entradaMake } from './entrada/endpoint';
export { auditarAdministrativo, auditarClinico, auditarDomicilios } from './auditoria/triggers';
export { accesoPorAdulto, accesoPorVinculo } from './acceso/triggers';
export { despacharEvento, reintentarEventos } from './outbox/triggers';
export { eventoFamiliaCreada, eventoMembresiaAlta, eventoFiebreNueva } from './outbox/eventosTriggers';
export { avisosCadaHora, avisosDiarios } from './outbox/programadosTriggers';
export { portalClinico, portalPaciente, portalFamilia, portalMembresia, portalTurno, portalPago, portalCalendario } from './portal/triggers';
