/**
 * Tokens de diseño: único archivo de colores, tipografía y medidas.
 * Paleta G de la app de Lovable (azul noche, celestes y verde agua) sobre el crema cálido del diseño
 * de Stitch (etapas S1 a S5), con contraste AA medido.
 * Texto sobre fondo de color: siempre el tono `texto` de su familia.
 */
import { Platform } from 'react-native';

export const colors = {
  /** Acción principal (botones, ítem activo): azul noche de la paleta G. Blanco encima: 11,8:1. */
  accion: '#1E3A52',
  /** Texto de acción y enlaces sobre fondo claro (5,9:1 sobre blanco; 5,3:1 sobre accionSuave). */
  accionTexto: '#2C6A93',
  accionSuave: '#EAF4FB',
  /** Títulos y texto fuerte. */
  primary: '#1E3A52',
  /** Azul profundo: íconos y texto destacado (5,2:1 sobre blanco; 4,9:1 sobre el crema). */
  primary2: '#33739A',
  /** Íconos de navegación y bordes (3,6:1 sobre el fondo). */
  primary3: '#4A8AB5',
  /** Celeste: líneas de gráficos y bordes finos (decorativo, nunca texto). */
  sky: '#8CC6E8',
  /** Verde agua de la paleta G (decorativo) y su versión suave para fondos. */
  sage: '#A8DDD0',
  sageSoft: '#EDF8F4',
  /** Crema para fondos cálidos. */
  cream: '#FBF8F4',
  bgSoft: '#EAF4FB',
  /** Fondo de la app: crema cálido (Stitch). */
  bg: '#FCF9F5',
  /** Fondo neutro (etiquetas, campos deshabilitados, selectores). */
  muted: '#F6F3EF',
  text: '#1E3A52',
  textMuted: '#48647A',
  white: '#FFFFFF',
  border: '#E9E4DD',
  /** Borde de campos de formulario. */
  input: '#CFE0EA',
  // Barra lateral (pantallas anchas).
  sidebar: '#1E3A52',
  sidebarTexto: '#B9CCDB',
  sidebarActivo: '#2D5375',
  sidebarApagado: '#8FA8BC',
  // Verde intenso: solo el botón de PacienteX (pedido del Dr.).
  contacto: '#1F7A4D',
  // Rojo intenso: solo alertas, siempre con ícono y palabra (nunca solo el color).
  alert: '#B42318',
  alertBg: '#FDECEA',
  alertBorder: '#F5C2BC',
  /** Anillo de foco visible (teclado, web). */
  foco: '#3A7CA5',
  /** Chips y cajas dentro de la tarjeta azul noche. */
  nocheSuave: 'rgba(255, 255, 255, 0.12)',
};

/**
 * Un color pastel por sección, adaptado a la paleta G (pedido del Dr., 28/10/2026): celeste para
 * crecimiento y agenda, rosado empolvado para vacunas y próximas acciones, verde agua para lo que
 * está al día, lavanda para la IA, crema arena para prevención. `fondo` va detrás, `acento` en
 * íconos (3:1 o más), `texto` para letras sobre `fondo` (AA, 4,5:1 o más).
 * Las claves se mantienen para no tocar las pantallas.
 */
export const categorias = {
  celeste: { fondo: '#EAF4FB', acento: '#3A7CA5', texto: '#1E5578' },
  rosado: { fondo: '#FBEFF2', acento: '#C0627C', texto: '#8E3D55' },
  verde: { fondo: '#EDF8F4', acento: '#2E8F7E', texto: '#1A6B5F' },
  violeta: { fondo: '#F2EFFA', acento: '#7D6BC4', texto: '#54459A' },
  naranja: { fondo: '#FAF4EA', acento: '#AE7F3F', texto: '#77521F' },
} as const;
export type Categoria = keyof typeof categorias;

/** Sombra suave de las tarjetas (la misma de la app de Lovable). */
export const sombra = '0px 1px 2px rgba(30, 58, 82, 0.04), 0px 10px 26px rgba(30, 58, 82, 0.06)';
/** Sombra más marcada de la tarjeta azul noche. */
export const sombraNoche = '0px 14px 32px -6px rgba(30, 58, 82, 0.18)';

/** Anillo de foco para elementos tocables (se ve al navegar con teclado en la web). */
export const anilloFoco = { outlineColor: colors.foco, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 } as object;

/** Desde este ancho (computadora o tablet apaisada) se usa barra lateral en vez de pestañas. */
export const ANCHO_ESCRITORIO = 1024;

/** Manrope para todo y Caveat para los toques manuscritos (diseño de Lovable, 28/10/2026). */
export const fonts = {
  title: 'Manrope_800ExtraBold',
  titleSemi: 'Manrope_700Bold',
  /** Parte liviana de los títulos editoriales (`TituloEditorial`). */
  titleLight: 'Manrope_300Light',
  body: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  /** Solo saludos y frases cortas; nunca datos ni texto largo. */
  hand: 'Caveat_600SemiBold',
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
  radius: 20,
  /** Tarjetas y paneles grandes. */
  radiusGrande: 28,
  gutter: 20,
};
