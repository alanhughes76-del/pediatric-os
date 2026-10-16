import * as WebBrowser from 'expo-web-browser';
import { colors } from '@/theme';

/** Abre el link de Cal.com en un navegador dentro de la app. Devuelve false si falta el link. */
export async function abrirAgenda(url: string): Promise<boolean> {
  if (!url) return false;
  await WebBrowser.openBrowserAsync(url, {
    toolbarColor: colors.primary,
    controlsColor: colors.primary,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
  return true;
}
