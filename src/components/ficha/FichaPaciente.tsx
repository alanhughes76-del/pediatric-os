/**
 * Ficha completa del paciente, del lado del médico. Bloques en este orden:
 * Contacto, Adultos responsables, Problemas de salud, Alergias, Plan de cuidado,
 * Crecimiento, Consultas, Registro de fiebre, Certificados y documentos.
 * (El portal de la familia usa su propia vista: components/FichaHijo.tsx.)
 */
import { useApp } from '@/data/store';
import { paciente as buscarPaciente } from '@/data/selectores';
import { Texto } from '../Texto';
import { Encabezado } from './Encabezado';
import { BloqueAdultos, BloqueContacto } from './Adultos';
import { BloqueAlergias, BloquePlan, BloqueProblemas } from './Clinica';
import { BloqueConsultas, BloqueCrecimiento, BloqueDocumentos, BloqueFiebre } from './Historia';

export function FichaPaciente({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const p = buscarPaciente(db, patientId);
  if (!p) return <Texto>No encontramos esta ficha.</Texto>;
  return (
    <>
      <Encabezado paciente={p} />
      <BloqueContacto patientId={p.id} />
      <BloqueAdultos patientId={p.id} />
      <BloqueProblemas patientId={p.id} />
      <BloqueAlergias patientId={p.id} />
      <BloquePlan patientId={p.id} />
      <BloqueCrecimiento paciente={p} />
      <BloqueConsultas patientId={p.id} />
      <BloqueFiebre patientId={p.id} />
      <BloqueDocumentos patientId={p.id} />
    </>
  );
}
