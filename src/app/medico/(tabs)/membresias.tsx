import { Pantalla } from '@/components/Pantalla';
import { Proximamente } from '@/components/Proximamente';

export default function MembresiasMedico() {
  return (
    <Pantalla>
      <Proximamente
        titulo="Membresías"
        incluye={[
          'Cargar plan, vigencia e hijos incluidos',
          'Registrar pagos: fecha, monto, moneda (ARS o USD) y medio de pago',
        ]}
      />
    </Pantalla>
  );
}
