/**
 * PDF del certificado, armado en el servidor al emitir (prompt maestro 7.11): encabezado de la
 * marca, título, el texto tal como se emitió, lugar y fecha, firma y la leyenda
 * "Documento generado digitalmente". Se guarda en Cloud Storage; nunca con un enlace público.
 * Lógica pura (devuelve los bytes), con tests.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export const LEYENDA_DIGITAL = 'Documento generado digitalmente';

// Paleta G de la app (src/theme.ts): azul noche, azul profundo, celeste, verde agua y texto atenuado.
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const AZUL = hex('#1E3A52');
const CELESTE = hex('#3A7CA5');
const CIELO = hex('#8CC6E8');
const VERDE_AGUA = hex('#A8DDD0');
const TEXTO = AZUL;
const GRIS = hex('#48647A');
const BORDE = hex('#CFE0EA');

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
  // Fuentes estándar del PDF (sin archivos que embeber): Helvetica, la más cercana a Manrope.
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Mancha celeste suave arriba a la derecha, como en la app.
  // Círculos superpuestos de poca opacidad: se ve como un degradé.
  for (let r = 180; r > 20; r -= 20) {
    page.drawCircle({ x: width + 20, y: height + 20, size: r, color: CIELO, opacity: 0.035 });
  }

  // Encabezado de la marca
  let y = height - 80;
  page.drawText('Dr. Alan Hughes', { x: margen, y, size: 22, font: sansBold, color: AZUL });
  y -= 17;
  page.drawText('P E D I A T R Í A   I N T E G R A L', { x: margen, y, size: 8, font: sansBold, color: CELESTE });
  y -= 16;
  // Banda de celeste a verde agua (dos tramos).
  page.drawRectangle({ x: margen, y: y - 3, width: ancho / 2, height: 3.5, color: CIELO });
  page.drawRectangle({ x: margen + ancho / 2, y: y - 3, width: ancho / 2, height: 3.5, color: VERDE_AGUA });

  // Título
  y -= 54;
  centrado(page, c.titulo, y, sansBold, 16, AZUL);
  page.drawRectangle({ x: width / 2 - 24, y: y - 12, width: 48, height: 2.5, color: VERDE_AGUA });

  // Cuerpo
  y -= 46;
  const tamano = 12;
  const interlineado = 19;
  for (const r of renglones(c.cuerpo, sans, tamano, ancho)) {
    page.drawText(r, { x: margen, y, size: tamano, font: sans, color: TEXTO });
    y -= interlineado;
  }

  // Lugar y fecha, a la derecha
  y -= 22;
  const lf = textoSeguro(lugarYFecha(c.lugar, c.fecha));
  page.drawText(lf, { x: width - margen - sans.widthOfTextAtSize(lf, tamano), y, size: tamano, font: sans, color: GRIS });

  // Firma
  y -= 80;
  centrado(page, 'Dr. Alan Hughes', y + 26, sansBold, 13, AZUL);
  page.drawLine({ start: { x: width / 2 - 120, y: y + 16 }, end: { x: width / 2 + 120, y: y + 16 }, thickness: 0.6, color: BORDE });
  centrado(page, c.firma, y, sans, 10, GRIS);

  // Leyenda
  centrado(page, LEYENDA_DIGITAL, 48, sans, 9, GRIS);
  return pdf.save();
}
