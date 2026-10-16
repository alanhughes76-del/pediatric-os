import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { Proximamente } from '@/components/Proximamente';

export default function MembresiaFamilia() {
  return (
    <Pantalla pie={<BarraPacienteX />}>
      <Proximamente
        titulo="Membresía y documentos"
        incluye={[
          'Plan, vigencia e hijos incluidos',
          'Pagos registrados',
          'Certificados para descargar en PDF',
        ]}
      />
    </Pantalla>
  );
}
