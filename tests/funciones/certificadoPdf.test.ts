import { PDFDocument } from 'pdf-lib';
import { lugarYFecha, pdfCertificado, textoSeguro } from '../../functions/src/certificadoPdf';

describe('PDF del certificado (servidor)', () => {
  test('lugar y fecha en castellano', () => {
    expect(lugarYFecha('Buenos Aires', '2026-10-17')).toBe('Buenos Aires, 17 de octubre de 2026');
  });

  test('las fuentes del PDF no tienen todos los caracteres: se quitan los que no entran', () => {
    expect(textoSeguro('Ñandú «niño» · MN 111.725 — “ok” 🙂')).toBe('Ñandú «niño» · MN 111.725 — "ok" ');
  });

  test('arma un PDF de una página, con título y autor', async () => {
    const bytes = await pdfCertificado({
      titulo: 'Constancia de atención',
      cuerpo: 'Certifico que Ana Prueba, de 2 años y 7 meses, recibió atención pediátrica en el día de la fecha. '.repeat(8),
      lugar: 'Buenos Aires', fecha: '2026-10-17', firma: 'Dr. Alan Hughes · Médico Pediatra · MN 111.725 · MP 448.970',
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    const leido = await PDFDocument.load(bytes);
    expect(leido.getPageCount()).toBe(1);
    expect(leido.getTitle()).toBe('Constancia de atención');
    expect(leido.getAuthor()).toBe('Dr. Alan Hughes');
  });
});
