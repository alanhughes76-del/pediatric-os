/**
 * Nuevo turno. Lo valida el servidor: si se superpone con un turno confirmado lo rechaza;
 * si hay avisos (fuera de horario, de zona, bloqueos…) los muestra y se puede guardar igual.
 */
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import type { Aviso } from '@shared/agenda';
import { useApp } from '@/data/store';
import type { DatosTurno } from '@/data/contrato';
import { Pantalla } from '@/components/Pantalla';
import { Titulo } from '@/components/Texto';
import { FormularioTurno } from '@/components/agenda/FormularioTurno';
import { ListaAvisos } from '@/components/agenda/piezas';
import { Aviso as AvisoError } from '@/components/Formulario';

export default function NuevoTurno() {
  const { operaciones } = useApp();
  const p = useLocalSearchParams<{ familia?: string; paciente?: string; dia?: string }>();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<{ datos: DatosTurno; confirmar: boolean; avisos: Aviso[] } | null>(null);

  const guardar = async (datos: DatosTurno, confirmar: boolean, aceptarAvisos = false) => {
    setGuardando(true);
    setError(null);
    const r = await operaciones.crearTurno({ ...datos, confirmar, aceptarAvisos });
    setGuardando(false);
    if (r.estado === 'guardado') {
      router.replace(`/medico/turno/${r.id}`);
    } else if (r.estado === 'avisos') {
      setPendiente({ datos, confirmar, avisos: r.avisos });
    } else {
      setPendiente(null);
      setError(r.mensaje);
    }
  };

  return (
    <Pantalla>
      <Titulo>Nuevo turno</Titulo>
      <FormularioTurno
        respuesta={(
          <>
            {error ? <AvisoError tono="alerta" texto={error} /> : null}
            {pendiente ? (
              <ListaAvisos
                avisos={pendiente.avisos}
                onRevisar={() => setPendiente(null)}
                onAceptar={() => guardar(pendiente.datos, pendiente.confirmar, true)}
              />
            ) : null}
          </>
        )}
        inicial={{ familyId: p.familia, patientId: p.paciente, dia: p.dia }}
        conHorario
        conConfirmar
        textoGuardar="Guardar turno"
        guardando={guardando}
        onGuardar={(d, c) => guardar(d, c)}
      />
    </Pantalla>
  );
}
