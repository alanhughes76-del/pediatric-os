import { router } from 'expo-router';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX, BotonPacienteX } from '@/components/BotonPacienteX';
import { useApp, useSesionFamilia } from '@/data/store';
import { puedePedirVisitas, TEXTO_MEMBRESIA_VENCIDA } from '@/data/selectores';
import { Aviso } from '@/components/Formulario';
import { Texto } from '@/components/Texto';
import { Boton } from '@/components/Boton';

export default function PedirVisita() {
  const { db } = useApp();
  const { guardian } = useSesionFamilia();

  // Con la membresía vencida no se piden visitas como miembro.
  if (!puedePedirVisitas(db, guardian.id)) {
    return (
      <Pantalla>
        <Aviso icono="information-circle" texto={TEXTO_MEMBRESIA_VENCIDA} />
        <BotonPacienteX />
      </Pantalla>
    );
  }

  return (
    <Pantalla pie={<BarraPacienteX />}>
      <Texto>¿Qué tipo de visita necesitás?</Texto>

      <Boton
        titulo="Control de salud"
        detalle="Controles programados de tu hijo"
        icono="heart-outline"
        onPress={() => router.push({ pathname: '/familia/pedir-visita', params: { tipo: 'control' } })}
      />
      <Boton
        titulo="Consulta por urgencia"
        detalle="Urgencias no críticas"
        icono="medkit-outline"
        variante="contorno"
        onPress={() => router.push('/familia/urgencia')}
      />

    </Pantalla>
  );
}
