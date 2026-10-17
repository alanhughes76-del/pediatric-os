/**
 * Archivos del paciente (prompt maestro 7.11): elegir, ver y nombrar.
 * - Nunca hay enlaces públicos: el médico lee el archivo con su sesión (reglas de Storage) y la app
 *   lo muestra desde la memoria del dispositivo. La familia va a tener enlaces firmados de pocos
 *   minutos que genera el servidor (Etapa 6).
 * - En la web se abre en una pestaña nueva; en el teléfono se guarda en la caché y se comparte.
 */
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

export interface ArchivoElegido { uri: string; name: string; mimeType: string; size?: number }

export const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/heic', 'image/webp'];
export const MAXIMO_BYTES = 20 * 1024 * 1024;

/** Valida tipo y tamaño (lo mismo que piden las reglas de Storage). Devuelve un error o null. */
export function problemaDelArchivo(a: Pick<ArchivoElegido, 'mimeType' | 'size'>): string | null {
  if (!TIPOS_PERMITIDOS.includes(a.mimeType)) return 'Solo se pueden subir PDF o imágenes (PNG, JPG, HEIC o WEBP).';
  if (a.size !== undefined && a.size >= MAXIMO_BYTES) return 'El archivo es demasiado grande (máximo 20 MB).';
  return null;
}

/** Nombre seguro para la ruta de Storage. */
export const nombreSeguro = (n: string) =>
  n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'archivo';

/** Abre el selector de archivos del dispositivo. null si se canceló. */
export async function elegirArchivo(): Promise<ArchivoElegido | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: TIPOS_PERMITIDOS, copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', size: a.size };
}

/** Muestra un archivo que ya está en la memoria (bytes leídos de Storage). */
export async function mostrarBytes(bytes: ArrayBuffer, nombre: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    window.open(url, '_blank', 'noopener');
    // La URL vive solo en esta pestaña; se libera al rato.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const archivo = new File(Paths.cache, nombreSeguro(nombre));
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(new Uint8Array(bytes));
  await mostrarUri(archivo.uri, mimeType);
}

/** Muestra un archivo local (modo demostración o recién elegido). */
export async function mostrarUri(uri: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(uri, '_blank', 'noopener');
    return;
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType });
}

/** Tipo de contenido según la extensión (para rutas ya guardadas). */
export const tipoPorNombre = (n: string) =>
  /\.pdf$/i.test(n) ? 'application/pdf' : /\.png$/i.test(n) ? 'image/png' : /\.(jpe?g)$/i.test(n) ? 'image/jpeg' : /\.heic$/i.test(n) ? 'image/heic' : /\.webp$/i.test(n) ? 'image/webp' : 'application/octet-stream';
