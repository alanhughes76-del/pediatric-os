/**
 * PDF del certificado: HTML con el encabezado de la marca → PDF (expo-print) → compartir o guardar
 * (expo-sharing). El PDF se arma siempre con el texto tal como se emitió, que no se edita.
 * En la etapa del backend, el PDF emitido se sube al almacenamiento de archivos (Document.file).
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Certificate } from '@/data/types';
import { LEYENDA_DIGITAL, lugarYFecha, tipoCertificado } from './certificados';

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function htmlCertificado(c: Certificate): string {
  const titulo = tipoCertificado(c.type).titulo;
  const anulado = c.status === 'anulado';
  // Diseño de Lovable (paleta G, Manrope), igual que el PDF del servidor (functions/src/certificadoPdf.ts).
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  /* Sin margen de página: el margen va en el cuerpo, así la mancha llega al borde sin cortarse. */
  @page { margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Manrope, Helvetica, Arial, sans-serif; color: #1E3A52; font-size: 12.5pt; line-height: 1.65; margin: 0; padding: 26mm 22mm; }
  .mancha { position: fixed; top: -60mm; right: -60mm; width: 130mm; height: 130mm; border-radius: 50%;
    background: radial-gradient(circle, rgba(140, 198, 232, 0.28) 0%, rgba(140, 198, 232, 0) 65%); z-index: -1; }
  .marca { font-weight: 800; font-size: 22pt; letter-spacing: -0.3px; color: #1E3A52; margin: 0; }
  .bajada { letter-spacing: 3px; font-size: 8.5pt; color: #3A7CA5; font-weight: 700; margin: 2px 0 0; }
  .banda { height: 4px; border-radius: 4px; background: linear-gradient(90deg, #8CC6E8, #A8DDD0); margin: 14px 0 36px; }
  h1 { font-weight: 800; font-size: 17pt; color: #1E3A52; text-align: center; margin: 0 0 6px; }
  .subrayado { width: 48px; height: 3px; border-radius: 3px; background: #A8DDD0; margin: 0 auto 28px; }
  .cuerpo { text-align: justify; }
  .fecha { text-align: right; margin-top: 30px; color: #48647A; }
  .firma { margin-top: 70px; text-align: center; }
  .firma .nombre { font-weight: 700; font-size: 14pt; color: #1E3A52; }
  .firma .datos { font-size: 10pt; color: #48647A; border-top: 1px solid #CFE0EA; display: inline-block; padding-top: 6px; margin-top: 6px; }
  .leyenda { margin-top: 48px; font-size: 8.5pt; color: #48647A; text-align: center; }
  .anulado { color: #B42318; background: #FDECEA; border: 1.5px solid #B42318; border-radius: 14px; padding: 8px 12px; font-weight: 700; text-align: center; margin-bottom: 20px; }
</style></head>
<body>
  <div class="mancha"></div>
  <p class="marca">Dr. Alan Hughes</p>
  <p class="bajada">PEDIATRÍA INTEGRAL</p>
  <div class="banda"></div>
  ${anulado ? `<div class="anulado">ANULADO${c.voidReason ? ` · ${escapar(c.voidReason)}` : ''}</div>` : ''}
  <h1>${escapar(titulo)}</h1>
  <div class="subrayado"></div>
  <p class="cuerpo">${escapar(c.body)}</p>
  <p class="fecha">${escapar(lugarYFecha(c.place, c.date))}</p>
  <div class="firma">
    <div class="nombre">Dr. Alan Hughes</div>
    <div class="datos">${escapar(c.signature)}</div>
  </div>
  <p class="leyenda">${LEYENDA_DIGITAL}</p>
</body></html>`;
}

export function nombreArchivo(c: Certificate, nombrePaciente: string): string {
  const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${limpio(tipoCertificado(c.type).titulo)}-${limpio(nombrePaciente)}-${c.date}.pdf`;
}

/** Genera el PDF y abre el menú del teléfono para guardarlo o compartirlo. En la web, abre la impresión. */
export async function compartirCertificado(c: Certificate, nombrePaciente: string): Promise<void> {
  const html = htmlCertificado(c);
  if (Platform.OS === 'web') {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 400);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: nombreArchivo(c, nombrePaciente) });
  }
}
