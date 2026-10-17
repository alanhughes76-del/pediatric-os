/**
 * Certificados: textos prearmados y armado del texto completo. Lógica pura.
 *
 * Formato:
 * "Certifico que [nombre y apellido], DNI [si está cargado], de [edad], [texto].
 *  Se extiende a pedido de [adulto responsable] para ser presentado ante [destino]."
 * Luego lugar y fecha ("Buenos Aires, 16 de octubre de 2026") y la firma.
 * El género (apto/apta) sale del sexo del paciente; con sexo X, redacción neutra.
 */
import type { CertificateType, Sex } from '@/data/types';
import { fechaLarga } from './fechas';

export const FIRMA = 'Dr. Alan Hughes · Médico Pediatra · MN 111.725 · MP 448.970';
export const LEYENDA_DIGITAL = 'Documento generado digitalmente';
export const LUGAR_POR_DEFECTO = 'Buenos Aires';

export interface TipoCertificado {
  tipo: CertificateType;
  titulo: string;
  /** Para qué se presenta (ayuda en la pantalla). */
  paraQue: string;
  destino: string;
  texto: (sexo: Sex) => string;
}

export const TIPOS_CERTIFICADO: TipoCertificado[] = [
  {
    tipo: 'aptitud-fisica',
    titulo: 'Certificado de aptitud física',
    paraQue: 'Para presentar en el colegio',
    destino: 'el colegio',
    texto: (sexo) => sexo === 'X'
      ? 'se encuentra en buen estado de salud y en condiciones de realizar actividad física escolar'
      : `se encuentra en buen estado de salud y ${sexo === 'F' ? 'apta' : 'apto'} para realizar actividad física escolar`,
  },
  {
    tipo: 'control-salud',
    titulo: 'Constancia de control de salud',
    paraQue: 'Para presentar ante la prepaga',
    destino: 'la prepaga',
    texto: () => 'realizó su control de salud con examen físico normal y crecimiento adecuado para su edad',
  },
  {
    tipo: 'buena-salud',
    titulo: 'Certificado de buena salud',
    paraQue: 'Para presentar en el jardín maternal',
    destino: 'el jardín maternal',
    texto: () => 'se encuentra en buen estado de salud y puede concurrir al jardín maternal',
  },
  {
    tipo: 'constancia-atencion',
    titulo: 'Constancia de atención',
    paraQue: 'Para justificar una ausencia o presentar donde la pidan',
    destino: '',
    // Redacción que no depende del sexo.
    texto: () => 'recibió atención pediátrica en el día de la fecha',
  },
  {
    tipo: 'libre',
    titulo: 'Certificado',
    paraQue: 'Texto libre',
    destino: '',
    texto: () => '',
  },
];

export const tipoCertificado = (t: CertificateType) => TIPOS_CERTIFICADO.find((x) => x.tipo === t)!;

export interface DatosCertificado {
  nombre: string; // nombre y apellido
  dni?: string;
  edad: string; // "3 años y 5 meses"
  texto: string;
  adulto: string;
  destino: string;
}

/** Texto completo del certificado. */
export function textoCertificado(d: DatosCertificado): string {
  const dni = d.dni?.trim() ? `, DNI ${d.dni.trim()}` : '';
  const texto = d.texto.trim().replace(/[.\s]+$/, '');
  const partes = [`Certifico que ${d.nombre}${dni}, de ${d.edad}, ${texto}.`];
  const pedido = d.adulto.trim() ? ` a pedido de ${d.adulto.trim()}` : '';
  const ante = d.destino.trim() ? ` para ser presentado ante ${d.destino.trim()}` : '';
  if (pedido || ante) partes.push(`Se extiende${pedido}${ante}.`);
  return partes.join(' ');
}

/** "Buenos Aires, 16 de octubre de 2026" */
export function lugarYFecha(lugar: string, fechaISO: string): string {
  return `${lugar.trim() || LUGAR_POR_DEFECTO}, ${fechaLarga(fechaISO)}`;
}
