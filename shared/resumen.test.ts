import { mailDelResumen } from './resumen';

describe('mail del resumen para la familia', () => {
  test('saluda a los adultos y lleva solo el resumen', () => {
    const m = mailDelResumen({ nombresAdultos: ['Lucía', 'Martín'], nombreChico: 'Tomás', fecha: '17/10/2026', resumen: '  Tiene una otitis.  ' });
    expect(m.asunto).toBe('Resumen de la consulta de Tomás');
    expect(m.texto).toBe('Hola, Lucía y Martín.\n\nTe dejo el resumen de la consulta de Tomás del 17/10/2026:\n\nTiene una otitis.\n\n'
      + 'Cualquier duda, escribime por PacienteX. Ante una urgencia, andá a la guardia o llamá al SAME (107).\n\nDr. Alan Hughes');
  });
  test('sin nombres, saludo neutro; tres adultos con comas', () => {
    expect(mailDelResumen({ nombresAdultos: [], nombreChico: 'Emma', fecha: 'hoy', resumen: 'x' }).texto.startsWith('Hola.')).toBe(true);
    expect(mailDelResumen({ nombresAdultos: ['A', 'B', 'C'], nombreChico: 'Emma', fecha: 'hoy', resumen: 'x' }).texto.startsWith('Hola, A, B y C.')).toBe(true);
  });
});
