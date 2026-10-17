/** Agenda y central de turnos (llega en la Etapa 3). Mientras tanto, las visitas del día están en Inicio. */
import { router } from 'expo-router';
import { Pantalla } from '@/components/Pantalla';
import { EstadoVacio } from '@/components/Estados';
import { Boton } from '@/components/Boton';

export default function Agenda() {
  return (
    <Pantalla>
      <EstadoVacio
        icono="calendar-outline"
        titulo="La agenda llega en la Etapa 3"
        texto="Vistas diaria, semanal y mensual, turnos con estados, avisos de superposición y reservas de Cal.com. Mientras tanto, las visitas de hoy están en Inicio."
        accion={<Boton titulo="Ver las visitas de hoy" icono="home-outline" variante="secundario" onPress={() => router.navigate('/medico')} />}
      />
    </Pantalla>
  );
}
