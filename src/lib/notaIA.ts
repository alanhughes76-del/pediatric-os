/**
 * Borrador de nota "con IA".
 * En esta etapa NO hay IA: se arma un borrador de ejemplo repartiendo las oraciones
 * del texto original en los cuatro campos. La conexión real va en la etapa del backend.
 *
 * Reglas para cuando se conecte la IA (también las respeta este borrador de ejemplo):
 * - En urgencias, marca la bandera clínica ante cualquier duda.
 * - En controles, no asume normalidad si algo no se dijo (un campo sin datos queda vacío).
 * - Nunca agrega diagnósticos, dosis ni plazos que no estén en el texto del médico.
 */
import type { VisitType } from '@/data/types';
import { esUrgencia } from '@/data/selectores';

export interface CamposNota {
  findings: string;
  plan: string;
  familySummary: string;
  allergiesMedication: string;
  clinicalFlag: boolean;
}

const CONDUCTA = /\b(indic|complet|volver|próximo control|control (?:en|a las|si)|consult|administr|pauta|segui|deriv|guardia|reevalu|tratamiento|dieta)/i;
const ALERGIA_MEDICACION = /\b(alerg|medicaci|antibi|paracetamol|ibuprofeno|amoxicilina|vitamina|hierro)/i;
const ALARMA = /\b(dificultad|convuls|decaíd|letárgi|rigidez|petequi|violácea|deshidrat|guardia|menor de 3 meses|no orina|vomita todo)/i;

export function borradorDeEjemplo(texto: string, tipo: VisitType, nombre: string): CamposNota | null {
  const oraciones = texto.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (oraciones.length === 0) return null;

  const conducta: string[] = [];
  const alergias: string[] = [];
  const hallazgos: string[] = [];
  for (const o of oraciones) {
    if (ALERGIA_MEDICACION.test(o)) alergias.push(o);
    if (CONDUCTA.test(o)) conducta.push(o);
    else if (!ALERGIA_MEDICACION.test(o)) hallazgos.push(o);
  }

  return {
    findings: hallazgos.join(' '),
    plan: conducta.join(' '),
    familySummary: [`Hoy vimos a ${nombre}.`, ...conducta].join(' '),
    allergiesMedication: alergias.join(' '),
    // En urgencias, ante cualquier duda, bandera.
    clinicalFlag: esUrgencia(tipo) || ALARMA.test(texto),
  };
}
