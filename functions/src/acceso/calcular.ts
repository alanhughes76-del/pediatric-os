/**
 * Acceso de un adulto al portal: a qué chicos puede ver.
 * Lógica pura. La usa el trigger que mantiene `portalAccess/{authUid}`, que es lo que miran las reglas.
 *
 * - El portal tiene que estar habilitado por el médico y el adulto tiene que tener email.
 * - Solo cuentan los vínculos vigentes: sin archivar y sin fecha de fin, o con fin posterior a hoy.
 */
export interface AdultoParaAcceso { portalEnabled?: boolean; email?: string | null; archivedAt?: unknown }
export interface VinculoParaAcceso { patientId: string; validTo?: string | null; archivedAt?: unknown }

export function calcularAcceso(adulto: AdultoParaAcceso, vinculos: VinculoParaAcceso[], hoy: string) {
  const vigentes = vinculos.filter((v) => !v.archivedAt && (!v.validTo || v.validTo > hoy));
  const patientIds = [...new Set(vigentes.map((v) => v.patientId))].sort();
  const enabled = adulto.portalEnabled === true && !!adulto.email && !adulto.archivedAt && patientIds.length > 0;
  return { enabled, patientIds };
}
