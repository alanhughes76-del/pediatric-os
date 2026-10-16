import { useState } from 'react';
import { router } from 'expo-router';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { Texto, TextoChico } from '@/components/Texto';
import { Boton } from '@/components/Boton';
import { abrirAgenda } from '@/lib/agenda';
import { CONFIG } from '@/config';
import { colors } from '@/theme';

export default function PedirVisita() {
  const [sinLink, setSinLink] = useState(false);

  return (
    <Pantalla pie={<BarraPacienteX />}>
      <Texto>¿Qué tipo de visita necesitás?</Texto>

      <Boton
        titulo="Control de salud"
        detalle="Controles programados de tu hijo"
        icono="heart-outline"
        onPress={async () => setSinLink(!(await abrirAgenda(CONFIG.calControlUrl)))}
      />
      <Boton
        titulo="Consulta por urgencia"
        detalle="Urgencias no críticas"
        icono="medkit-outline"
        variante="contorno"
        onPress={() => router.push('/familia/urgencia')}
      />

      {sinLink ? (
        <TextoChico color={colors.alert}>Todavía no está configurado el link de turnos. Contactame por PacienteX.</TextoChico>
      ) : null}
    </Pantalla>
  );
}
