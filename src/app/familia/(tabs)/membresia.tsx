/** "Mis datos" del portal (llega en la Etapa 6): teléfono, email, direcciones, membresía y pagos. */
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { EstadoVacio } from '@/components/Estados';

export default function MisDatos() {
  return (
    <Pantalla pie={<BarraPacienteX />}>
      <EstadoVacio
        icono="person-outline"
        titulo="Mis datos llega pronto"
        texto="Vas a poder actualizar tu teléfono, tu email y tus direcciones, y ver tu membresía y tus pagos. Mientras tanto, si algo cambió, escribime por PacienteX."
      />
    </Pantalla>
  );
}
