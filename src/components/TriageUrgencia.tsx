/**
 * Triage de urgencia (Tally, prompt maestro 8.2): las respuestas que la familia completó antes de la
 * visita. Solo lo ve el médico. Se usa en la pantalla del triage y en el turno al que está adjunto.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '@/data/store';
import type { Triage } from '@/data/types';
import { fechaHoraCorta } from '@/lib/fechas';
import { Caja } from './Caja';
import { Boton } from './Boton';
import { Aviso } from './Formulario';
import { Texto, TextoFuerte, TextoChico } from './Texto';

export function TriageUrgencia({ t }: { t: Triage }) {
  const { operaciones } = useApp();
  const [error, setError] = useState<string | null>(null);
  return (
    <Caja titulo="Triage de urgencia" icono="alert-circle-outline" color="rosado" ancha>
      <TextoChico>Completado el {fechaHoraCorta(t.recibidoAt)}{t.contacto.nombre ? ` por ${t.contacto.nombre}` : ''}. Lo ves solo vos.</TextoChico>
      {t.respuestas.map((r, n) => (
        <View key={n} style={{ gap: 2 }}>
          <TextoFuerte>{r.pregunta}</TextoFuerte>
          <Texto>{r.respuesta || '—'}</Texto>
        </View>
      ))}
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      {t.revisadoAt ? <TextoChico>Revisado el {fechaHoraCorta(t.revisadoAt)}.</TextoChico> : (
        <Boton titulo="Ya lo leí" icono="checkmark" compacto variante="secundario"
          onPress={async () => setError(await operaciones.actualizarEntrada('triage', t.id, { revisadoAt: new Date().toISOString() }))} />
      )}
    </Caja>
  );
}
