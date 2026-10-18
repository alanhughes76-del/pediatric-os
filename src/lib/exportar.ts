/**
 * Exportar un archivo armado en la app (reportes): en la web se descarga; en el teléfono se guarda en la
 * caché y se abre el menú para compartir o guardar. Un PDF sale de un HTML (en la web, con la impresión
 * del navegador, que permite "Guardar como PDF").
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { nombreSeguro } from './archivos';

export async function exportarTexto(nombre: string, texto: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([texto], { type: `${mimeType};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const archivo = new File(Paths.cache, nombreSeguro(nombre));
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(texto);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(archivo.uri, { mimeType, dialogTitle: nombre });
}

export async function exportarPdf(nombre: string, html: string): Promise<void> {
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
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: nombre });
}
