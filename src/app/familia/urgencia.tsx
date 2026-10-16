import { useState } from 'react';
import { Pantalla } from '@/components/Pantalla';
import { SignosDeAlarma } from '@/components/SignosDeAlarma';
import { Boton } from '@/components/Boton';
import { TextoChico } from '@/components/Texto';
import { abrirAgenda } from '@/lib/agenda';
import { CONFIG } from '@/config';
import { colors } from '@/theme';

/** Pantalla obligatoria antes de pedir una consulta por urgencia. */
export default function AntesDeLaUrgencia() {
  const [sinLink, setSinLink] = useState(false);
  return (
    <Pantalla>
      <SignosDeAlarma />
      <Boton
        titulo="Entendido, no es una emergencia"
        icono="checkmark-circle-outline"
        onPress={async () => setSinLink(!(await abrirAgenda(CONFIG.calUrgenciaUrl)))}
      />
      {sinLink ? (
        <TextoChico color={colors.alert}>Todavía no está configurado el link de turnos. Contactá al Dr. por PacienteX.</TextoChico>
      ) : null}
    </Pantalla>
  );
}
