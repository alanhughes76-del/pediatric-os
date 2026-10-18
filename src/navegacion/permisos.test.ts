import { datosDeEjemplo as DB } from '@/data/mock';
import { modulosDe, puedeEntrar, rutaDelPaciente, vistaAsistente } from './permisos';

describe('asistente', () => {
  test('ve Inicio, Agenda, Pacientes y Familias; el médico, todo', () => {
    expect(modulosDe('asistente').map((m) => m.clave)).toEqual(['inicio', 'agenda', 'pacientes', 'familias']);
    expect(modulosDe('medico').length).toBeGreaterThan(10);
  });

  test('entra a agenda, familias, membresías y pagos; no a lo clínico ni a Configuración', () => {
    for (const r of ['/medico', '/medico/agenda', '/medico/turno/t1', '/medico/familia/f1', '/medico/membresia/f1', '/medico/pago', '/medico/adulto/g1', '/medico/interesados', '/medico/paciente/nuevo']) {
      expect(puedeEntrar('asistente', r)).toBe(true);
    }
    for (const r of ['/medico/hijo/p1', '/medico/consulta/c1', '/medico/historia', '/medico/fiebre', '/medico/vacunas', '/medico/certificados',
      '/medico/accesos', '/medico/configuracion', '/medico/ia', '/medico/triage/x', '/medico/plaud/x', '/medico/reportes', '/medico/agendaX']) {
      expect(puedeEntrar('asistente', r)).toBe(false);
    }
    expect(puedeEntrar('medico', '/medico/hijo/p1')).toBe(true);
  });

  test('tocar un paciente: el médico va a la ficha; el asistente, a la familia', () => {
    expect(rutaDelPaciente('medico', { id: 'p1', familyId: 'f1' })).toBe('/medico/hijo/p1');
    expect(rutaDelPaciente('asistente', { id: 'p1', familyId: 'f1' })).toBe('/medico/familia/f1');
    expect(rutaDelPaciente('asistente', { id: 'p1' })).toBe('/medico/pacientes');
  });

  test('su vista no tiene nada clínico, pero sí lo administrativo', () => {
    const v = vistaAsistente(DB);
    expect(DB.problems.length + DB.notes.length + DB.fever.length).toBeGreaterThan(0);
    for (const t of ['problems', 'allergies', 'consultations', 'notes', 'fever', 'vaccineDoses', 'certificates', 'documents', 'auditLog'] as const) {
      expect(v[t]).toEqual([]);
    }
    expect(v.patients).toBe(DB.patients);
    expect(v.appointments).toBe(DB.appointments);
    expect(v.payments).toBe(DB.payments);
    expect(v.ia.enabled).toBe(false);
  });
});
