import { textoCertificado, tipoCertificado, lugarYFecha, TIPOS_CERTIFICADO, plantillaInicial, textoDePlantilla, destinoDePlantilla } from './certificados';

const base = { nombre: 'Tomás Ruiz Ferreyra', edad: '3 años y 5 meses', adulto: 'Lucía Ferreyra', destino: 'el colegio' };

test('formato completo con DNI', () => {
  const t = textoCertificado({ ...base, dni: '58.912.345', texto: tipoCertificado('aptitud-fisica').texto('M') });
  expect(t).toBe('Certifico que Tomás Ruiz Ferreyra, DNI 58.912.345, de 3 años y 5 meses, se encuentra en buen estado de salud y apto para realizar actividad física escolar. Se extiende a pedido de Lucía Ferreyra para ser presentado ante el colegio.');
});

test('sin DNI cargado, no aparece', () => {
  const t = textoCertificado({ ...base, texto: 'algo' });
  expect(t.startsWith('Certifico que Tomás Ruiz Ferreyra, de 3 años y 5 meses, algo.')).toBe(true);
  expect(t).not.toContain('DNI');
});

test('el género sale del sexo; con X, redacción neutra', () => {
  const aptitud = tipoCertificado('aptitud-fisica');
  expect(aptitud.texto('F')).toContain('apta para');
  expect(aptitud.texto('M')).toContain('apto para');
  expect(aptitud.texto('X')).not.toMatch(/apt[oa]/);
  expect(aptitud.texto('X')).toContain('en condiciones de realizar actividad física escolar');
});

test('los textos prearmados de cada tipo', () => {
  expect(tipoCertificado('control-salud').texto('F')).toBe('realizó su control de salud con examen físico normal y crecimiento adecuado para su edad');
  expect(tipoCertificado('buena-salud').texto('M')).toBe('se encuentra en buen estado de salud y puede concurrir al jardín maternal');
  expect(tipoCertificado('control-salud').destino).toBe('la prepaga');
  expect(tipoCertificado('buena-salud').destino).toBe('el jardín maternal');
  expect(TIPOS_CERTIFICADO.map((t) => t.tipo)).toEqual(['aptitud-fisica', 'control-salud', 'buena-salud', 'constancia-atencion', 'libre']);
});

test('no duplica el punto final si el texto ya lo trae', () => {
  expect(textoCertificado({ ...base, texto: 'goza de buena salud.' })).toContain('goza de buena salud. Se extiende');
});

test('lugar y fecha', () => {
  expect(lugarYFecha('Buenos Aires', '2026-10-16')).toBe('Buenos Aires, 16 de octubre de 2026');
  expect(lugarYFecha('', '2026-10-16')).toBe('Buenos Aires, 16 de octubre de 2026');
});

test('constancia de atención: redacción neutra, igual para cualquier sexo', () => {
  const t = tipoCertificado('constancia-atencion');
  expect(t.titulo).toBe('Constancia de atención');
  expect(t.texto('M')).toBe(t.texto('F'));
  expect(t.texto('X')).toBe('recibió atención pediátrica en el día de la fecha');
});

describe('plantillas de certificados (Configuración)', () => {
  test('sin cambios, el texto prearmado de siempre (con su redacción neutra)', () => {
    expect(textoDePlantilla({}, 'aptitud-fisica', 'F')).toBe(tipoCertificado('aptitud-fisica').texto('F'));
    expect(textoDePlantilla({}, 'aptitud-fisica', 'X')).toBe(tipoCertificado('aptitud-fisica').texto('X'));
    expect(destinoDePlantilla({}, 'control-salud')).toBe('la prepaga');
  });

  test('la plantilla inicial marca dónde va apto/apta', () => {
    expect(plantillaInicial('aptitud-fisica').texto).toContain('{apto}');
    expect(plantillaInicial('control-salud').texto).not.toContain('{apto}');
  });

  test('lo que guardó el Dr., con apto/apta según el sexo', () => {
    const p = { 'aptitud-fisica': { texto: 'está {apto} para natación', destino: 'el club' } };
    expect(textoDePlantilla(p, 'aptitud-fisica', 'F')).toBe('está apta para natación');
    expect(textoDePlantilla(p, 'aptitud-fisica', 'M')).toBe('está apto para natación');
    expect(textoDePlantilla(p, 'aptitud-fisica', 'X')).toBe('está en condiciones para natación');
    expect(destinoDePlantilla(p, 'aptitud-fisica')).toBe('el club');
    expect(textoDePlantilla(p, 'libre', 'F')).toBe('');
  });
});
