import { useState } from 'react';
import { Pantalla } from '@/components/Pantalla';
import { SignosDeAlarma } from '@/components/SignosDeAlarma';
import { useApp, useSesionFamilia } from '@/data/store';
import { puedePedirVisitas, TEXTO_MEMBRESIA_VENCIDA } from '@/data/selectores';
import { Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { TextoChico } from '@/components/Texto';
import { abrirAgenda } from '@/lib/agenda';
import { CONFIG } from '@/config';
import { colors } from '@/theme';

/** Pantalla obligatoria antes de pedir una consulta por urgencia. */
export default function AntesDeLaUrgencia() {
  const [sinLink, setSinLink] = useState(false);
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
        onPress={async () => setSinLink(!(await abrirAgenda(CONFIG.calUrgenciaUrl)))}
      /> : null}
      {sinLink ? (
        <TextoChico color={colors.alert}>Todavía no está configurado el link de turnos. Escribime por PacienteX.</TextoChico>
      ) : null}
    </Pantalla>
  );
}
