import { contextoBiblioteca, contextoConsulta, contextoHistoria, edadEnTexto, encabezado } from '../../functions/src/ia/contexto';
import { ESQUEMAS, esAccionIA, normalizarResultado, SISTEMA } from '../../functions/src/ia/acciones';

const HOY = '2026-10-17';
const paciente = {
  id: 'p1', firstName: 'Tomás', lastName: 'Ruiz Ferreyra', dni: '50.123.456', dniDigits: '50123456', birthDate: '2023-05-12', sex: 'M',
  familyId: 'f1', coverage: { kind: 'prepaga', name: 'OSDE', memberNumber: '123' }, address: 'Libertador 2210',
};

describe('IA: lo que se le manda (mínimo, sin identificar)', () => {
  test('edad en texto', () => {
    expect(edadEnTexto('2023-05-12', HOY)).toBe('3 años y 5 meses');
    expect(edadEnTexto('2026-01-20', HOY)).toBe('8 meses');
    expect(edadEnTexto('2026-10-05', HOY)).toBe('12 días');
  });

  test('sin nombre, DNI, cobertura, dirección ni contacto', () => {
    const texto = contextoHistoria({
      paciente,
      alergias: [{ allergen: 'Amoxicilina', status: 'confirmada', reaction: 'urticaria' }],
      problemas: [{ description: 'Dermatitis atópica', status: 'activo', since: '2024-01-10' }],
      consultas: [{ id: 'c1', occurredAt: '2026-06-09T19:00:00-03:00', visitType: 'urgencia-noche' }],
      notas: [{ consultationId: 'c1', status: 'aprobada', version: 1, findings: 'Otitis derecha', plan: 'Control en 48 h' }],
    }, HOY);
    for (const dato of ['Tomás', 'Ruiz', '50.123.456', '50123456', 'OSDE', 'Libertador', 'f1']) expect(texto).not.toContain(dato);
    expect(texto).toContain('Paciente pediátrico de 3 años y 5 meses, sexo masculino');
    expect(texto).toContain('Amoxicilina (confirmada, urticaria)');
    expect(texto).toContain('hallazgos: Otitis derecha; conducta: Control en 48 h');
  });

  test('una consulta sin nota aprobada no manda borradores', () => {
    const texto = contextoHistoria({
      paciente, consultas: [{ id: 'c2', occurredAt: '2026-10-01T10:00:00-03:00', visitType: 'control' }],
      notas: [{ consultationId: 'c2', status: 'borrador', findings: 'BORRADOR' }],
    }, HOY);
    expect(texto).not.toContain('BORRADOR');
    expect(texto).toContain('sin nota aprobada');
  });

  test('evolución: el texto del médico, la edad y las alergias confirmadas (no las referidas)', () => {
    const texto = contextoConsulta({
      paciente, alergias: [{ allergen: 'Maní', status: 'confirmada' }, { allergen: 'Huevo', status: 'referida' }],
    }, { visitType: 'control', rawText: 'Control de rutina. Peso 14 kg.' }, HOY);
    expect(texto).toContain('Control de rutina. Peso 14 kg.');
    expect(texto).toContain('Maní');
    expect(texto).not.toContain('Huevo');
    expect(texto).not.toContain('Tomás');
  });

  test('encabezado con edad gestacional y biblioteca con ids', () => {
    expect(encabezado({ birthDate: '2026-09-01', sex: 'F', gestationalWeeks: 34 }, HOY)).toContain('nacido a las 34 semanas');
    expect(contextoBiblioteca([{ id: 'm1', title: 'Sueño seguro', topics: ['sueño'], ageFromMonths: 0, ageToMonths: 12 }])).toContain('[id m1] Sueño seguro');
  });
});

describe('IA: reglas y respuestas', () => {
  test('las reglas del Dr. van en el sistema', () => {
    expect(SISTEMA).toContain('Nunca agregás diagnósticos, dosis');
    expect(SISTEMA).toContain('datosFaltantes');
    expect(SISTEMA).toContain('SAME 107');
  });

  test('esquemas cerrados (sin campos extra)', () => {
    for (const e of Object.values(ESQUEMAS)) expect(e).toMatchObject({ type: 'object', additionalProperties: false });
    expect(esAccionIA('preparar_evolucion')).toBe(true);
    expect(esAccionIA('recetar')).toBe(false);
  });

  test('un material o un estudio con id inventado no llega a la pantalla', () => {
    expect(normalizarResultado('sugerir_material', { sugerencias: [{ materialId: 'm1', motivo: 'a' }, { materialId: 'inventado', motivo: 'b' }], datosFaltantes: [] }, { materiales: ['m1'] }))
      .toEqual({ sugerencias: [{ materialId: 'm1', motivo: 'a' }], datosFaltantes: [] });
    expect(normalizarResultado('revisar_estudios', { resumen: 'r', pendientes: [{ studyId: 'x', comentario: 'c' }], datosFaltantes: [] }, { estudios: ['e1'] }))
      .toEqual({ resumen: 'r', pendientes: [], datosFaltantes: [] });
  });

  test('una respuesta con otra forma se rechaza', () => {
    expect(normalizarResultado('preparar_evolucion', { hallazgos: 'x' })).toBeNull();
    expect(normalizarResultado('resumir_historia', 'texto suelto')).toBeNull();
    expect(normalizarResultado('consulta_libre', { respuesta: ' sí ', datosFaltantes: ['peso'] })).toEqual({ respuesta: 'sí', datosFaltantes: ['peso'] });
  });
});

describe('IA: orquestación con un modelo falso (no se llama a la API)', () => {
  const { ejecutarAccion } = require('../../functions/src/ia/ejecutar') as typeof import('../../functions/src/ia/ejecutar');
  type Pedido = { sistema: string; usuario: string; esquema: Record<string, unknown> };
  const falso = (respuesta: Record<string, unknown>, recibido: Pedido[] = []) => async (p: Pedido) => { recibido.push(p); return { estado: 'ok' as const, json: respuesta, modelo: 'falso', tokensEntrada: 10, tokensSalida: 5 }; };

  test('evolución: manda el texto de la consulta y devuelve los cuatro campos', async () => {
    const recibido: Pedido[] = [];
    const r = await ejecutarAccion({ accion: 'preparar_evolucion', consulta: { visitType: 'control', rawText: 'Control de rutina, todo bien.' } }, { paciente },
      falso({ hallazgos: 'h', conducta: 'c', resumenFamilia: 'r', alergiasMedicacion: '', banderaClinica: false, motivoBandera: '', datosFaltantes: ['peso'] }, recibido), HOY);
    expect(r).toMatchObject({ estado: 'ok', resultado: { hallazgos: 'h', banderaClinica: false, datosFaltantes: ['peso'] } });
    expect(recibido[0].usuario).toContain('Control de rutina, todo bien.');
    expect(recibido[0].usuario).not.toContain('Tomás');
    expect(recibido[0].sistema).toBe(SISTEMA);
  });

  test('sin texto de consulta o sin pregunta no se llama al modelo', async () => {
    const recibido: Pedido[] = [];
    expect((await ejecutarAccion({ accion: 'preparar_evolucion', consulta: { rawText: '' } }, { paciente }, falso({}, recibido), HOY)).estado).toBe('sin_datos');
    expect((await ejecutarAccion({ accion: 'consulta_libre', pregunta: '  ' }, { paciente }, falso({}, recibido), HOY)).estado).toBe('sin_datos');
    expect(recibido).toHaveLength(0);
  });

  test('rechazo y respuesta con otra forma se informan en palabras', async () => {
    const rechazo = async () => ({ estado: 'rechazo' as const });
    expect(await ejecutarAccion({ accion: 'resumir_historia' }, { paciente }, rechazo, HOY)).toMatchObject({ estado: 'rechazo', error: expect.stringContaining('Escribilo vos') });
    expect(await ejecutarAccion({ accion: 'resumir_historia' }, { paciente }, falso({ otra: 'cosa' }), HOY)).toMatchObject({ estado: 'incompleta' });
  });

  test('sugerir material: solo de la biblioteca, sin archivados', async () => {
    const r = await ejecutarAccion({ accion: 'sugerir_material' }, { paciente, materiales: [{ id: 'm1', title: 'Sueño', topics: [] }, { id: 'm2', title: 'Viejo', topics: [], archivedAt: 'x' }] },
      falso({ sugerencias: [{ materialId: 'm1', motivo: 'edad' }, { materialId: 'm2', motivo: 'x' }], datosFaltantes: [] }), HOY);
    expect(r.resultado).toEqual({ sugerencias: [{ materialId: 'm1', motivo: 'edad' }], datosFaltantes: [] });
  });
});
