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
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
  @page { margin: 28mm 24mm; }
  body { font-family: 'Source Sans 3', Helvetica, Arial, sans-serif; color: #22415A; font-size: 13pt; line-height: 1.6; }
  .marca { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 24pt; color: #1B4D7E; margin: 0; }
  .bajada { letter-spacing: 3px; font-size: 9pt; color: #3C87BE; font-weight: 600; margin: 2px 0 0; }
  .linea { border: 0; border-top: 2px solid #1B4D7E; margin: 14px 0 34px; }
  h1 { font-family: 'Playfair Display', Georgia, serif; font-weight: 600; font-size: 18pt; color: #1B4D7E; text-align: center; margin: 0 0 28px; }
  .cuerpo { text-align: justify; }
  .fecha { text-align: right; margin-top: 30px; }
  .firma { margin-top: 70px; text-align: center; }
  .firma .trazo { font-family: 'Playfair Display', Georgia, serif; font-size: 16pt; color: #1B4D7E; }
  .firma .datos { font-size: 10.5pt; border-top: 1px solid #6FB3DA; display: inline-block; padding-top: 6px; margin-top: 6px; }
  .leyenda { margin-top: 48px; font-size: 9pt; color: #5A7389; text-align: center; }
  .anulado { color: #B42318; border: 2px solid #B42318; padding: 8px 12px; font-weight: 600; text-align: center; margin-bottom: 20px; }
</style></head>
<body>
  <p class="marca">Dr. Alan Hughes</p>
  <p class="bajada">PEDIATRÍA INTEGRAL</p>
  <hr class="linea">
  ${anulado ? `<div class="anulado">ANULADO${c.voidReason ? ` · ${escapar(c.voidReason)}` : ''}</div>` : ''}
  <h1>${escapar(titulo)}</h1>
  <p class="cuerpo">${escapar(c.body)}</p>
  <p class="fecha">${escapar(lugarYFecha(c.place, c.date))}</p>
  <div class="firma">
    <div class="trazo">Dr. Alan Hughes</div>
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
