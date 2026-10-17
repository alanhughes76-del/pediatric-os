import { MODULOS, moduloActivo, moduloPorClave } from './modulos';

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
  ['/medico/modulo/vacunas', 'vacunas'],
  ['/medico/modulo/configuracion', 'configuracion'],
  ['/medico/agenda', 'agenda'],
])('%s marca %s', (ruta, clave) => {
  expect(moduloActivo(ruta)).toBe(clave);
});

test('cada módulo pendiente dice en qué etapa llega', () => {
  expect(moduloPorClave('ia')?.pendiente?.etapa).toBe('Etapa 9');
  expect(moduloPorClave('pacientes')?.pendiente).toBeUndefined();
});
