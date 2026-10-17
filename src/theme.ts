export const colors = {
  primary: '#1B4D7E',
  primary2: '#2E6FA8',
  primary3: '#3C87BE',
  sky: '#6FB3DA',
  bgSoft: '#E8F3FA',
  bg: '#F4F8FB',
  text: '#22415A',
  textMuted: '#5A7389',
  white: '#FFFFFF',
  border: '#DCE7F0',
  // Barra lateral (pantallas anchas).
  sidebar: '#16324F',
  sidebarTexto: '#A9BCD0',
  sidebarActivo: '#24496F',
  sidebarApagado: '#7590AC',
  // Verde: solo para el botón de contacto por PacienteX (pedido del Dr.).
  contacto: '#1F7A4D',
  // Rojo: solo para alertas (alergias, signos de alarma, vencimientos).
  alert: '#B42318',
  alertBg: '#FDECEA',
  alertBorder: '#F5C2BE',
};

/**
 * Colores de categoría (paleta aprobada por el Dr., 17/10/2026): tonos suaves, sin saturar.
 * `fondo` va detrás, `acento` para íconos, `texto` para letras sobre `fondo` (contraste AA).
 * No reemplazan al rojo (solo alertas) ni al verde de PacienteX.
 */
export const categorias = {
  celeste: { fondo: '#E6F3FA', acento: '#3C87BE', texto: '#1F5A85' },
  verdeAgua: { fondo: '#E3F4F1', acento: '#2E8A80', texto: '#1E6A62' },
  lavanda: { fondo: '#EEEDF8', acento: '#6E66B0', texto: '#4C4590' },
  durazno: { fondo: '#FBEEE6', acento: '#C9784A', texto: '#8F4A22' },
  arena: { fondo: '#F8F1DE', acento: '#B08A2E', texto: '#6E5414' },
} as const;
export type Categoria = keyof typeof categorias;

/** Sombra suave de las tarjetas. */
export const sombra = '0px 1px 2px rgba(22, 50, 79, 0.06), 0px 4px 14px rgba(22, 50, 79, 0.06)';

/** Desde este ancho (computadora o tablet apaisada) se usa barra lateral en vez de pestañas. */
export const ANCHO_ESCRITORIO = 1024;

export const fonts = {
  title: 'PlayfairDisplay_700Bold',
  titleSemi: 'PlayfairDisplay_600SemiBold',
  body: 'SourceSans3_400Regular',
  bodySemi: 'SourceSans3_600SemiBold',
  bodyBold: 'SourceSans3_700Bold',
};

export const size = {
  base: 18,
  small: 15,
  large: 21,
  h1: 30,
  h2: 24,
  h3: 20,
  /** Alto mínimo de un botón: cómodo con una sola mano. */
  touch: 56,
  radius: 16,
  gutter: 20,
};
