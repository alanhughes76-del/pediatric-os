/**
 * Teléfonos en formato E.164 para celulares de Argentina: "+549" + código de área + número
 * (10 dígitos en total, sin el 0 ni el 15). Acepta lo que se escriba con o sin 0, 54, 9 o 15,
 * con espacios, guiones o paréntesis (sección 7.3 del prompt maestro).
 * Devuelve null si no se puede interpretar como un celular argentino.
 */
export function normalizarTelefono(texto: string): string | null {
  const conMas = texto.trim().startsWith('+');
  let d = texto.replace(/\D/g, '');
  if (!d) return null;

  if (d.startsWith('54') && (conMas || d.length >= 12)) {
    d = d.slice(2);
    if (d.startsWith('9')) d = d.slice(1);
  } else if (d.startsWith('0')) {
    d = d.slice(1);
  }

  // Si quedó el "15" después del código de área (2, 3 o 4 dígitos), se saca.
  if (d.length === 12) {
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }
  return /^[1-9]\d{9}$/.test(d) ? `+549${d}` : null;
}

/** Para mostrar: "+54 9 11 5555-0101" (área de Buenos Aires) o "+54 9 351 555-0101". */
export function telefonoLegible(e164: string): string {
  const d = e164.replace(/^\+549/, '');
  if (d.length !== 10) return e164;
  const area = d.startsWith('11') ? 2 : 3;
  const resto = d.slice(area);
  return `+54 9 ${d.slice(0, area)} ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
}
