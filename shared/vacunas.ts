/**
 * Vacunas (prompt maestro 7.8). Lógica pura que usan la app y el servidor.
 *
 * - La fuente es `assets/data/calendario_vacunas.json`, tal cual. Es un BORRADOR: hasta que el
 *   Dr. lo marque como verificado se muestra "Calendario sin verificar" y no salen recordatorios.
 *   Acá no se inventa ni se corrige ninguna dosis ni edad: se usa lo que dice el archivo.
 * - El esquema de un paciente: una dosis por fila del calendario, con la fecha estimada
 *   (fecha de nacimiento + edad en meses, en meses de calendario).
 * - "Atrasada" no se guarda: es una dosis pendiente cuya fecha estimada ya pasó.
 */
import calendario from '../assets/data/calendario_vacunas.json';

export interface DosisCalendario {
  vacuna: string;
  dosis: string;
  edad_texto: string;
  edad_meses: number;
  tipo: string;
}

export const CALENDARIO: DosisCalendario[] = (calendario as { dosis: DosisCalendario[] }).dosis;
export const ESTADO_CALENDARIO: string = (calendario as { estado: string }).estado;

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Clave estable de una dosis del calendario (la misma vacuna puede tener dos refuerzos). */
export const claveDosis = (d: Pick<DosisCalendario, 'vacuna' | 'dosis' | 'edad_meses'>) => `${slug(d.vacuna)}-${slug(d.dosis)}-${d.edad_meses}`;

/** "AAAA-MM-DD" + n meses de calendario (el 31 pasa al último día del mes si hace falta). */
export function sumarMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const total = m - 1 + meses;
  const anio = a + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${anio}-${pad(mes + 1)}-${pad(Math.min(d, ultimo))}`;
}

export interface DosisDelEsquema {
  clave: string;
  vaccine: string;
  dose: string;
  ageText: string;
  ageMonths: number;
  dueDate: string;
}

/** Esquema de un paciente según el calendario (solo las obligatorias). */
export function esquemaPara(fechaNacimiento: string, cal: DosisCalendario[] = CALENDARIO): DosisDelEsquema[] {
  return cal
    .filter((d) => d.tipo === 'obligatoria')
    .map((d) => ({
      clave: claveDosis(d),
      vaccine: d.vacuna,
      dose: d.dosis,
      ageText: d.edad_texto,
      ageMonths: d.edad_meses,
      dueDate: sumarMeses(fechaNacimiento, d.edad_meses),
    }));
}

export type EstadoDosis = 'aplicada' | 'atrasada' | 'pendiente';

export function estadoDosis(d: { status: 'pendiente' | 'aplicada'; dueDate?: string }, hoy: string): EstadoDosis {
  if (d.status === 'aplicada') return 'aplicada';
  return d.dueDate && d.dueDate < hoy ? 'atrasada' : 'pendiente';
}

export interface DosisResumen { vaccine: string; dose: string; status: 'pendiente' | 'aplicada'; dueDate?: string; appliedDate?: string; archivedAt?: string }

/** Para la tarjeta del Resumen: al día o cuántas atrasadas, la última aplicada y la próxima. */
export function resumenVacunas<T extends DosisResumen>(dosis: T[], hoy: string) {
  const vigentes = dosis.filter((d) => !d.archivedAt);
  const atrasadas = vigentes.filter((d) => estadoDosis(d, hoy) === 'atrasada');
  const ultima = vigentes.filter((d) => d.status === 'aplicada' && d.appliedDate).sort((a, b) => b.appliedDate!.localeCompare(a.appliedDate!))[0];
  const proxima = vigentes.filter((d) => estadoDosis(d, hoy) === 'pendiente' && d.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0];
  return { alDia: atrasadas.length === 0, atrasadas, ultima, proxima, total: vigentes.length };
}

/** Recordatorios a las familias: solo con el calendario verificado (prueba 10 del prompt maestro). */
export const puedeRecordarVacunas = (config: { calendarioVerificado: boolean }) => config.calendarioVerificado === true;
