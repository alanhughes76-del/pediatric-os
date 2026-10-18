/**
 * Las acciones de la IA Asistente (prompt maestro 7.18): instrucciones, formato de respuesta (esquema
 * JSON) y cómo se valida lo que vuelve. Lógica pura, con tests. La respuesta siempre es una propuesta.
 */
export const ACCIONES_IA = ['resumir_historia', 'preparar_evolucion', 'sugerir_material', 'revisar_estudios', 'consulta_libre'] as const;
export type AccionIA = (typeof ACCIONES_IA)[number];
export const esAccionIA = (a: unknown): a is AccionIA => typeof a === 'string' && (ACCIONES_IA as readonly string[]).includes(a);

/** Reglas fijas del Dr. Van en el sistema, para todas las acciones. */
export const SISTEMA = `Sos un asistente para un pediatra que atiende a domicilio en Argentina. Escribís en español rioplatense, claro y profesional.

Reglas que no se negocian:
- Lo que escribís es una propuesta: el pediatra la revisa y decide. Nunca tomás decisiones clínicas.
- Usás solo los datos que te pasan. Nunca agregás diagnósticos, dosis, medicaciones ni plazos que no estén en esos datos.
- Si faltan datos para responder bien, lo decís en "datosFaltantes" en lugar de suponer. En un control, si algo no se dijo, no asumís que es normal: queda vacío.
- No inventás valores, fechas ni resultados.
- No sos un servicio de emergencias. Si en los datos aparecen signos de alarma, lo señalás para que el pediatra decida (guardia o SAME 107).`;

type Esquema = Record<string, unknown>;
const texto = { type: 'string' };
const listaTextos = { type: 'array', items: texto };
const objeto = (properties: Record<string, unknown>): Esquema => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

export const ESQUEMAS: Record<AccionIA, Esquema> = {
  resumir_historia: objeto({ resumen: texto, datosFaltantes: listaTextos }),
  preparar_evolucion: objeto({
    hallazgos: texto, conducta: texto, resumenFamilia: texto, alergiasMedicacion: texto,
    banderaClinica: { type: 'boolean' }, motivoBandera: texto, datosFaltantes: listaTextos,
  }),
  sugerir_material: objeto({ sugerencias: { type: 'array', items: objeto({ materialId: texto, motivo: texto }) }, datosFaltantes: listaTextos }),
  revisar_estudios: objeto({ resumen: texto, pendientes: { type: 'array', items: objeto({ studyId: texto, comentario: texto }) }, datosFaltantes: listaTextos }),
  consulta_libre: objeto({ respuesta: texto, datosFaltantes: listaTextos }),
};

export const INSTRUCCIONES: Record<AccionIA, string> = {
  resumir_historia: 'Resumí la historia del paciente para el pediatra: antecedentes relevantes, problemas activos, alergias, medicación, lo más importante de las últimas consultas y lo que queda pendiente. Breve y ordenado.',
  preparar_evolucion: `Prepará el borrador de la nota de esta consulta a partir del texto del médico, repartido en cuatro campos:
- hallazgos: lo que el médico encontró y relató.
- conducta: lo que indicó o planeó (sin agregar nada que no esté en el texto).
- resumenFamilia: un resumen para la familia, en lenguaje simple y cálido, sin términos técnicos innecesarios. Solo lo que está en el texto.
- alergiasMedicacion: alergias y medicación mencionadas en el texto o en la historia.
banderaClinica: en una urgencia, true ante cualquier duda o signo de alarma; en un control, true solo si el texto muestra algo que requiera seguimiento. Explicá el motivo en motivoBandera (vacío si es false).
Si un campo no tiene datos en el texto, dejalo vacío.`,
  sugerir_material: 'Elegí de la biblioteca del médico los materiales que más le sirven a esta familia según la edad y los problemas del paciente. Solo materiales de la biblioteca, citados por su id exacto. Como máximo 3, con el motivo en una oración. Si ninguno corresponde, devolvé la lista vacía.',
  revisar_estudios: 'Revisá los estudios del paciente: cuáles siguen pendientes, cuáles tienen resultado sin revisar y cuáles ya pasaron su fecha de "revisar el". Citá cada estudio por su id exacto con un comentario breve. Solo con los datos que tenés.',
  consulta_libre: 'Respondé la pregunta del pediatra sobre este paciente, solo con los datos de la historia. Si la historia no alcanza para responder, decilo.',
};

type Datos = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/**
 * Valida y limpia lo que devolvió el modelo. Lo que cita ids (materiales, estudios) se filtra contra
 * los ids reales: un id inventado no llega a la pantalla. Devuelve null si la forma no corresponde.
 */
export function normalizarResultado(accion: AccionIA, crudo: unknown, ids: { materiales?: string[]; estudios?: string[] } = {}): Datos | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const r = crudo as Datos;
  const datosFaltantes = strs(r.datosFaltantes);
  switch (accion) {
    case 'resumir_historia':
      return typeof r.resumen === 'string' ? { resumen: str(r.resumen), datosFaltantes } : null;
    case 'consulta_libre':
      return typeof r.respuesta === 'string' ? { respuesta: str(r.respuesta), datosFaltantes } : null;
    case 'preparar_evolucion':
      if (typeof r.banderaClinica !== 'boolean') return null;
      return {
        hallazgos: str(r.hallazgos), conducta: str(r.conducta), resumenFamilia: str(r.resumenFamilia), alergiasMedicacion: str(r.alergiasMedicacion),
        banderaClinica: r.banderaClinica, motivoBandera: str(r.motivoBandera), datosFaltantes,
      };
    case 'sugerir_material': {
      if (!Array.isArray(r.sugerencias)) return null;
      const validos = new Set(ids.materiales ?? []);
      const sugerencias = (r.sugerencias as Datos[]).map((x) => ({ materialId: str(x.materialId), motivo: str(x.motivo) }))
        .filter((x) => validos.has(x.materialId)).slice(0, 3);
      return { sugerencias, datosFaltantes };
    }
    case 'revisar_estudios': {
      if (typeof r.resumen !== 'string' || !Array.isArray(r.pendientes)) return null;
      const validos = new Set(ids.estudios ?? []);
      const pendientes = (r.pendientes as Datos[]).map((x) => ({ studyId: str(x.studyId), comentario: str(x.comentario) })).filter((x) => validos.has(x.studyId));
      return { resumen: str(r.resumen), pendientes, datosFaltantes };
    }
  }
}
