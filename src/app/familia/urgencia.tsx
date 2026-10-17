import { router } from 'expo-router';
import { Pantalla } from '@/components/Pantalla';
import { SignosDeAlarma } from '@/components/SignosDeAlarma';
import { useApp, useSesionFamilia } from '@/data/store';
import { puedePedirVisitas, TEXTO_MEMBRESIA_VENCIDA } from '@/data/selectores';
import { Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';

/** Pantalla obligatoria antes de pedir una consulta por urgencia. */
export default function AntesDeLaUrgencia() {
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  const puede = puedePedirVisitas(db, guardian.id);
  return (
    <Pantalla>
      <SignosDeAlarma />
      {!puede ? <Aviso icono="information-circle" texto={TEXTO_MEMBRESIA_VENCIDA} /> : null}
      {puede ? <Boton
        titulo="Entendido, no es una emergencia"
        icono="checkmark-circle-outline"
        onPress={() => router.replace({ pathname: '/familia/pedir-visita', params: { tipo: 'urgencia' } })}
      /> : null}
    </Pantalla>
  );
}
