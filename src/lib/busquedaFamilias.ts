/**
 * Búsqueda de familias (prompt maestro 7.3): por apellido o nombre de la familia, nombre de un
 * adulto, teléfono o nombre de un hijo. Sin distinguir mayúsculas ni tildes.
 */
import type { Database, Family } from '@/data/types';
import { normalizar } from '@shared/duplicados';

export function filtrarFamilias(db: Pick<Database, 'families' | 'guardians' | 'patients'>, consulta: string): Family[] {
  const familias = db.families
    .filter((f) => !f.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  const q = normalizar(consulta);
  if (!q) return familias;

  const digitos = q.replace(/\D/g, '');
  const esTelefono = digitos.length >= 6 && /^[\d\s()+-]+$/.test(q);

  return familias.filter((f) => {
    const adultos = db.guardians.filter((g) => g.familyId === f.id && !g.archivedAt);
    if (esTelefono) return adultos.some((g) => g.phone?.replace(/\D/g, '').includes(digitos));
    const hijos = db.patients.filter((p) => p.familyId === f.id && !p.archivedAt);
    const textos = [f.name, ...adultos.map((g) => `${g.firstName} ${g.lastName}`), ...hijos.map((p) => `${p.firstName} ${p.lastName}`)].map(normalizar);
    const palabras = q.split(/\s+/);
    return textos.some((t) => palabras.every((w) => t.includes(w)));
  });
}
