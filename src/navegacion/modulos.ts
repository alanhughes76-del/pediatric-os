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

const aPacientes = { titulo: 'Ir a Pacientes', href: '/medico/pacientes' as Href, icono: 'people-outline' as NombreIcono };

export const MODULOS: Modulo[] = [
  { clave: 'inicio', titulo: 'Inicio', icono: 'home-outline', href: '/medico', rutas: ['/medico', '/medico/seguimiento', '/medico/fiebre', '/medico/accesos'] },
  { clave: 'agenda', titulo: 'Agenda', icono: 'calendar-outline', href: '/medico/agenda', rutas: ['/medico/agenda', '/medico/turno'] },
  {
    clave: 'pacientes', titulo: 'Pacientes', icono: 'people-outline', href: '/medico/pacientes',
    rutas: ['/medico/pacientes', '/medico/hijo', '/medico/paciente', '/medico/consulta', '/medico/certificado'],
  },
  {
    clave: 'familias', titulo: 'Familias', icono: 'people-circle-outline', href: '/medico/familias',
    rutas: ['/medico/familias', '/medico/familia', '/medico/membresias', '/medico/adulto'],
  },
  { clave: 'historia', titulo: 'Historia clínica', icono: 'document-text-outline', href: '/medico/historia', rutas: ['/medico/historia'] },
  { clave: 'consultas', titulo: 'Consultas', icono: 'medkit-outline', href: '/medico/consultas', rutas: ['/medico/consultas'] },
  { clave: 'prescripciones', titulo: 'Prescripciones', icono: 'reader-outline', href: '/medico/prescripciones', rutas: ['/medico/prescripciones'] },
  { clave: 'estudios', titulo: 'Estudios', icono: 'flask-outline', href: '/medico/estudios', rutas: ['/medico/estudios'] },
  { clave: 'vacunas', titulo: 'Vacunas', icono: 'shield-checkmark-outline', href: '/medico/vacunas', rutas: ['/medico/vacunas'] },
  { clave: 'crecimiento', titulo: 'Crecimiento', icono: 'trending-up-outline', href: '/medico/crecimiento', rutas: ['/medico/crecimiento'] },
  mod('certificados', 'Certificados', 'ribbon-outline', 'Etapa 5', 'Listado de certificados emitidos y anulados. Hoy se emiten desde la ficha de cada paciente.', [aPacientes]),
  mod('prevencion', 'Prevención', 'leaf-outline', 'Etapa 5', 'Biblioteca de materiales que cargás vos, sugeridos según la edad del paciente.'),
  mod('comunicaciones', 'Comunicaciones', 'chatbubbles-outline', 'Etapa 7', 'Registro de lo que sale por las automatizaciones y lo que registres a mano. No es un chat: las conversaciones siguen por PacienteX.'),
  mod('documentos', 'Documentos', 'folder-open-outline', 'Etapa 5', 'Archivos de cada paciente, con enlaces de descarga temporales.'),
  mod('reportes', 'Reportes', 'bar-chart-outline', 'Etapa 7', 'Reporte mensual con datos reales del sistema, exportable a CSV y PDF.'),
  mod('ia', 'IA Asistente', 'sparkles-outline', 'Etapa 9', 'Propuestas que revisás vos. Arranca apagada hasta que revises el consentimiento para usar IA con datos de salud.'),
];

/** Abajo en la barra lateral (y al final de "Más"). */
export const CONFIGURACION: Modulo = mod('configuracion', 'Configuración', 'settings-outline', 'Etapa 7', 'Datos profesionales, agenda, ámbitos, membresía y precios, links, calendario de vacunas, plantillas, automatizaciones e IA.');

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
