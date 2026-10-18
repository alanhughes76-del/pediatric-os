/** Comunicaciones de un paciente (y de su familia), para la ficha: registro, no chat. */
import { View } from 'react-native';
import { useApp } from '@/data/store';
import { claseDe, comunicaciones, direccionDe, momentoDe, TEXTO_CANAL, TEXTO_CLASE, TEXTO_ESTADO, TEXTO_TIPO } from '@/data/comunicaciones';
import { fechaHoraCorta } from '@/lib/fechas';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { colors } from '@/theme';

export function comunicacionesDelPaciente(db: ReturnType<typeof useApp>['db'], patientId: string) {
  const familyId = db.patients.find((p) => p.id === patientId)?.familyId;
  return comunicaciones(db).filter((c) => c.patientId === patientId || (!c.patientId && familyId && c.familyId === familyId));
}

export function ComunicacionesPaciente({ patientId, limite }: { patientId: string; limite?: number }) {
  const { db } = useApp();
  const lista = comunicacionesDelPaciente(db, patientId).slice(0, limite ?? 100);
  if (lista.length === 0) return <Texto color={colors.textMuted}>Todavía no hay comunicaciones registradas.</Texto>;
  return (
    <View style={{ gap: 8 }}>
      {lista.map((c) => (
        <Tarjeta key={c.id} style={{ gap: 4, boxShadow: 'none' }}>
          <TextoFuerte>{c.subject || TEXTO_TIPO[c.kind]}</TextoFuerte>
          <TextoChico>{fechaHoraCorta(momentoDe(c))} · {direccionDe(c) === 'entrante' ? 'Entrante' : 'Saliente'} · {TEXTO_CANAL[c.channel] ?? c.channel}</TextoChico>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Etiqueta texto={TEXTO_CLASE[claseDe(c)]} tono={claseDe(c) === 'urgente' ? 'alerta' : 'neutro'} />
            <Etiqueta texto={TEXTO_ESTADO[c.status] ?? c.status} tono={c.status === 'entregado' ? 'verde' : c.status === 'fallido' ? 'alerta' : 'neutro'} />
          </View>
        </Tarjeta>
      ))}
    </View>
  );
}
