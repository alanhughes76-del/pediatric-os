/**
 * Los módulos de Pediatric OS (prompt maestro 5.2), en el orden de la barra lateral.
 * Es la única lista: la usan la barra lateral (web y tablet), la barra inferior y "Más" (celular).
 * Los que todavía no existen abren una pantalla que dice en qué etapa llegan, con atajos
 * a lo que hoy ya funciona (nada queda escondido).
 */
import type { Href } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';

type NombreIcono = keyof typeof Ionicons.glyphMap;

export interface Modulo {
  clave: string;
  titulo: string;
  icono: NombreIcono;
  href: Href;
  /** Prefijos de ruta que marcan este ítem como activo. */
  rutas: string[];
  /** Si todavía no existe: en qué etapa llega y qué va a tener. */
  pendiente?: { etapa: string; texto: string };
  /** Atajos a lo que ya funciona hoy. */
  atajos?: { titulo: string; href: Href; icono: NombreIcono }[];
}

const mod = (clave: string, titulo: string, icono: NombreIcono, etapa: string, texto: string, atajos?: Modulo['atajos']): Modulo => ({
  clave,
  titulo,
  icono,
  href: { pathname: '/medico/modulo/[clave]', params: { clave } },
  rutas: [`/medico/modulo/${clave}`],
  pendiente: { etapa, texto },
  atajos,
});


export const MODULOS: Modulo[] = [
  { clave: 'inicio', titulo: 'Inicio', icono: 'home-outline', href: '/medico', rutas: ['/medico', '/medico/seguimiento', '/medico/fiebre', '/medico/accesos'] },
  { clave: 'agenda', titulo: 'Agenda', icono: 'calendar-outline', href: '/medico/agenda', rutas: ['/medico/agenda', '/medico/turno'] },
  {
    clave: 'pacientes', titulo: 'Pacientes', icono: 'people-outline', href: '/medico/pacientes',
    rutas: ['/medico/pacientes', '/medico/hijo', '/medico/paciente', '/medico/consulta', '/medico/certificado'],
  },
  {
    clave: 'familias', titulo: 'Familias', icono: 'people-circle-outline', href: '/medico/familias',
    rutas: ['/medico/familias', '/medico/familia', '/medico/membresias', '/medico/membresia', '/medico/pago', '/medico/adulto', '/medico/interesados'],
  },
  { clave: 'historia', titulo: 'Historia clínica', icono: 'document-text-outline', href: '/medico/historia', rutas: ['/medico/historia'] },
  { clave: 'consultas', titulo: 'Consultas', icono: 'medkit-outline', href: '/medico/consultas', rutas: ['/medico/consultas', '/medico/plaud'] },
  { clave: 'prescripciones', titulo: 'Prescripciones', icono: 'reader-outline', href: '/medico/prescripciones', rutas: ['/medico/prescripciones'] },
  { clave: 'estudios', titulo: 'Estudios', icono: 'flask-outline', href: '/medico/estudios', rutas: ['/medico/estudios'] },
  { clave: 'vacunas', titulo: 'Vacunas', icono: 'shield-checkmark-outline', href: '/medico/vacunas', rutas: ['/medico/vacunas'] },
  { clave: 'crecimiento', titulo: 'Crecimiento', icono: 'trending-up-outline', href: '/medico/crecimiento', rutas: ['/medico/crecimiento'] },
  { clave: 'certificados', titulo: 'Certificados', icono: 'ribbon-outline', href: '/medico/certificados', rutas: ['/medico/certificados'] },
  { clave: 'prevencion', titulo: 'Prevención', icono: 'leaf-outline', href: '/medico/prevencion', rutas: ['/medico/prevencion'] },
  { clave: 'comunicaciones', titulo: 'Comunicaciones', icono: 'chatbubbles-outline', href: '/medico/comunicaciones', rutas: ['/medico/comunicaciones'] },
  { clave: 'documentos', titulo: 'Documentos', icono: 'folder-open-outline', href: '/medico/documentos', rutas: ['/medico/documentos'] },
  { clave: 'reportes', titulo: 'Reportes', icono: 'bar-chart-outline', href: '/medico/reportes', rutas: ['/medico/reportes'] },
  mod('ia', 'IA Asistente', 'sparkles-outline', 'Etapa 9', 'Propuestas que revisás vos. Arranca apagada hasta que revises el consentimiento para usar IA con datos de salud.'),
];

/** Abajo en la barra lateral (y al final de "Más"). */
export const CONFIGURACION: Modulo = { clave: 'configuracion', titulo: 'Configuración', icono: 'settings-outline', href: '/medico/configuracion', rutas: ['/medico/configuracion'] };

export const todosLosModulos = () => [...MODULOS, CONFIGURACION];

export const moduloPorClave = (clave: string) => todosLosModulos().find((m) => m.clave === clave);

/** El ítem activo para una ruta: el de prefijo más largo que coincida. */
export function moduloActivo(ruta: string): string | undefined {
  let mejor: { clave: string; largo: number } | undefined;
  for (const m of todosLosModulos()) {
    for (const r of m.rutas) {
      const coincide = r === '/medico' ? ruta === '/medico' : ruta === r || ruta.startsWith(`${r}/`);
      if (coincide && (!mejor || r.length > mejor.largo)) mejor = { clave: m.clave, largo: r.length };
    }
  }
  return mejor?.clave;
}

/** Pestañas de la barra inferior del celular (prompt maestro 5.3). El resto va en "Más". */
export const EN_PESTANAS = ['inicio', 'agenda', 'pacientes'];
