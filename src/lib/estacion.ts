/**
 * Estación del año en Argentina (hemisferio sur), por fechas astronómicas aproximadas:
 * otoño desde el 21/3, invierno desde el 21/6, primavera desde el 21/9 y verano desde el 21/12.
 * Solo para el saludo de Inicio.
 */
export type Estacion = 'verano' | 'otoño' | 'invierno' | 'primavera';

/** `dia` en formato "aaaa-mm-dd" (o una fecha ISO: se usan sus primeros diez caracteres). */
export function estacionDe(dia: string): Estacion {
  const md = Number(dia.slice(5, 7)) * 100 + Number(dia.slice(8, 10));
  if (md >= 1221 || md < 321) return 'verano';
  if (md < 621) return 'otoño';
  if (md < 921) return 'invierno';
  return 'primavera';
}

const FRASE: Record<Estacion, string> = {
  verano: 'Verano: mucha agua, sombra y protector solar',
  otoño: 'Otoño: vuelven los resfríos, manos limpias',
  invierno: 'Invierno: época de bronquiolitis, a ventilar los ambientes',
  primavera: 'Primavera: alergias y picaduras en el radar',
};

/** Línea corta para el saludo, sin datos de pacientes. */
export const fraseDeEstacion = (dia: string) => FRASE[estacionDe(dia)];
