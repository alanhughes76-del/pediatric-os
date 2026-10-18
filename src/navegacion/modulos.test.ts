import { todosLosModulos, MODULOS, moduloActivo, moduloPorClave } from './modulos';

test('la barra lateral tiene los 16 módulos del prompt maestro, en orden', () => {
  expect(MODULOS.map((m) => m.titulo)).toEqual([
    'Inicio', 'Agenda', 'Pacientes', 'Familias', 'Historia clínica', 'Consultas', 'Prescripciones', 'Estudios',
    'Vacunas', 'Crecimiento', 'Certificados', 'Prevención', 'Comunicaciones', 'Documentos', 'Reportes', 'IA Asistente',
  ]);
});

test.each([
  ['/medico', 'inicio'],
  ['/medico/fiebre/p-tomas', 'inicio'],
  ['/medico/hijo/p-tomas', 'pacientes'],
  ['/medico/consulta/c1', 'pacientes'],
  ['/medico/membresias', 'familias'],
  ['/medico/familia/f-ferreyra', 'familias'],
  ['/medico/familias', 'familias'],
  ['/medico/vacunas', 'vacunas'],
  ['/medico/prevencion', 'prevencion'],
  ['/medico/reportes', 'reportes'],
  ['/medico/comunicaciones', 'comunicaciones'],
  ['/medico/ia', 'ia'],
  ['/medico/turno/t1', 'agenda'],
  ['/medico/configuracion', 'configuracion'],
  ['/medico/agenda', 'agenda'],
])('%s marca %s', (ruta, clave) => {
  expect(moduloActivo(ruta)).toBe(clave);
});

test('desde la Etapa 9 no queda ningún módulo pendiente', () => {
  expect(todosLosModulos().filter((m) => m.pendiente)).toEqual([]);
  expect(moduloPorClave('ia')?.href).toBe('/medico/ia');
});
