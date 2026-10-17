/**
 * PDF del certificado, armado en el servidor al emitir (prompt maestro 7.11): encabezado de la
 * marca, título, el texto tal como se emitió, lugar y fecha, firma y la leyenda
 * "Documento generado digitalmente". Se guarda en Cloud Storage; nunca con un enlace público.
 * Lógica pura (devuelve los bytes), con tests.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export const LEYENDA_DIGITAL = 'Documento generado digitalmente';

const AZUL = rgb(0x1b / 255, 0x4d / 255, 0x7e / 255);
const CELESTE = rgb(0x3c / 255, 0x87 / 255, 0xbe / 255);
const TEXTO = rgb(0x22 / 255, 0x41 / 255, 0x5a / 255);
const GRIS = rgb(0.45, 0.5, 0.55);

/** Las fuentes estándar del PDF solo tienen los caracteres latinos (WinAnsi): el resto se quita. */
export function textoSeguro(t: string): string {
  return t
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\n -~ -ÿ–—•…€]/g, '');
}

/** Corta un párrafo en renglones que entran en `ancho`. */
export function renglones(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const salida: string[] = [];
  for (const parrafo of textoSeguro(texto).split('\n')) {
    let linea = '';
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho || !linea) linea = prueba;
      else { salida.push(linea); linea = palabra; }
    }
    salida.push(linea);
  }
  return salida;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const lugarYFecha = (lugar: string, fecha: string) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return `${lugar}, ${d} de ${MESES[m - 1]} de ${a}`;
};

function centrado(page: PDFPage, texto: string, y: number, fuente: PDFFont, tamano: number, color = TEXTO) {
  const t = textoSeguro(texto);
  const { width } = page.getSize();
  page.drawText(t, { x: (width - fuente.widthOfTextAtSize(t, tamano)) / 2, y, size: tamano, font: fuente, color });
}

export async function pdfCertificado(c: { titulo: string; cuerpo: string; lugar: string; fecha: string; firma: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(textoSeguro(c.titulo));
  pdf.setAuthor('Dr. Alan Hughes');
  pdf.setProducer('Pediatric OS');
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margen = 68;
  const ancho = width - margen * 2;
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Encabezado de la marca
  let y = height - 80;
  page.drawText('Dr. Alan Hughes', { x: margen, y, size: 24, font: serifBold, color: AZUL });
  y -= 18;
  page.drawText('PEDIATRÍA A DOMICILIO', { x: margen, y, size: 9, font: sansBold, color: CELESTE });
  y -= 14;
  page.drawLine({ start: { x: margen, y }, end: { x: width - margen, y }, thickness: 1.5, color: AZUL });

  // Título
  y -= 54;
  centrado(page, c.titulo, y, serifBold, 17, AZUL);

  // Cuerpo
  y -= 44;
  const tamano = 12;
  const interlineado = 19;
  for (const r of renglones(c.cuerpo, sans, tamano, ancho)) {
    page.drawText(r, { x: margen, y, size: tamano, font: sans, color: TEXTO });
    y -= interlineado;
  }

  // Lugar y fecha, a la derecha
  y -= 22;
  const lf = textoSeguro(lugarYFecha(c.lugar, c.fecha));
  page.drawText(lf, { x: width - margen - sans.widthOfTextAtSize(lf, tamano), y, size: tamano, font: sans, color: TEXTO });

  // Firma
  y -= 90;
  page.drawLine({ start: { x: width / 2 - 120, y: y + 16 }, end: { x: width / 2 + 120, y: y + 16 }, thickness: 0.6, color: GRIS });
  centrado(page, c.firma, y, sans, 10.5);

  // Leyenda
  centrado(page, LEYENDA_DIGITAL, 48, sans, 9, GRIS);
  return pdf.save();
}
