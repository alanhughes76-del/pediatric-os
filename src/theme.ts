/**
 * Tokens de diseño de Pediatric OS: único archivo de colores, tipografía y medidas.
 * Colores medidos sobre docs/referencia-ui.png y ajustados para contraste AA
 * (Etapa 0, sección 9.1). Texto sobre fondo de color: siempre el tono `texto` de su familia.
 */
import { Platform } from 'react-native';

export const colors = {
  /** Acción principal (botones, ítem activo, enlaces). Blanco encima: 5,2:1. */
  accion: '#2563EB',
  /** Texto de acción sobre fondo claro (6,4:1 sobre accionSuave). */
  accionTexto: '#1D4ED8',
  accionSuave: '#EAF1FE',
  /** Títulos y texto fuerte (azul marino casi negro, como en la imagen). */
  primary: '#1F2A44',
  primary2: '#2563EB',
  primary3: '#3B8FE0',
  sky: '#93C5FD',
  bgSoft: '#EAF1FE',
  bg: '#F4F8FC',
  text: '#1F2A44',
  textMuted: '#5B6585',
  white: '#FFFFFF',
  border: '#E3EAF3',
  // Barra lateral (pantallas anchas).
  sidebar: '#1E2B4D',
  sidebarTexto: '#AEB9D3',
  sidebarActivo: '#2F4A8A',
  sidebarApagado: '#8A96B2',
  // Verde intenso: solo el botón de PacienteX (pedido del Dr.).
  contacto: '#1F7A4D',
  // Rojo intenso: solo alertas, siempre con ícono y palabra (nunca solo el color).
  alert: '#C62828',
  alertBg: '#FDECEC',
  alertBorder: '#F6C7C7',
  /** Anillo de foco visible (teclado, web). */
  foco: '#2563EB',
};

/**
 * Un color pastel por sección (prompt maestro 5.1): celeste para crecimiento y agenda,
 * rosado para vacunas y próximas acciones, verde para lo que está al día, violeta para la IA,
 * naranja para prevención. `fondo` va detrás, `acento` en íconos, `texto` para letras sobre `fondo`.
 */
export const categorias = {
  celeste: { fondo: '#E3F1FD', acento: '#3B8FE0', texto: '#1D5C99' },
  rosado: { fondo: '#FDEEF3', acento: '#D9467A', texto: '#A12B57' },
  verde: { fondo: '#E5F5EC', acento: '#3E9B63', texto: '#1F6B40' },
  violeta: { fondo: '#F0EBFC', acento: '#7C5CD6', texto: '#5B3FB0' },
  naranja: { fondo: '#FEF0E4', acento: '#E07A2E', texto: '#9A4A12' },
} as const;
export type Categoria = keyof typeof categorias;

/** Sombra suave de las tarjetas. */
export const sombra = '0px 1px 2px rgba(30, 43, 77, 0.06), 0px 4px 14px rgba(30, 43, 77, 0.06)';

/** Anillo de foco para elementos tocables (se ve al navegar con teclado en la web). */
export const anilloFoco = { outlineColor: colors.foco, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 } as object;

/** Desde este ancho (computadora o tablet apaisada) se usa barra lateral en vez de pestañas. */
export const ANCHO_ESCRITORIO = 1024;

/** Inter (prompt maestro 5.1). */
export const fonts = {
  title: 'Inter_700Bold',
  titleSemi: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

const web = Platform.OS === 'web';

export const size = {
  /** Cuerpo: 16 en la web y 17 en el celular. */
  base: web ? 16 : 17,
  small: web ? 13.5 : 14.5,
  large: web ? 18 : 19,
  h1: 28,
  h2: 22,
  h3: 18,
  /** Alto mínimo de un botón: cómodo con una sola mano (y mayor a 44 px). */
  touch: 52,
  radius: 14,
  gutter: 20,
};
