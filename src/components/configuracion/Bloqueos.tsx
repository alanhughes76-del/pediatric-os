/**
 * Bloqueos de la agenda (vacaciones, congresos…): prompt maestro 7.21. Mientras dura un bloqueo, la
 * agenda avisa si se carga un turno en ese horario (shared/agenda.ts). No se borran: se archivan.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { aCampos, ahoraISO, deCampos, fechaHoraCorta } from '@/lib/fechas';
import { CampoFecha } from '../CampoFecha';
import { deCampo } from '@/lib/calendario';
import { Campo, Aviso } from '../Formulario';
import { Boton } from '../Boton';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { BotonTexto } from '../ficha/piezas';
import { colors } from '@/theme';

export function Bloqueos() {
  const { db, agregar, actualizar } = useApp();
  const ahora = ahoraISO();
  const vigentes = db.blocks.filter((b) => !b.archivedAt && b.hasta >= ahora).sort((a, b) => a.desde.localeCompare(b.desde));
  const [abierto, setAbierto] = useState(false);
  const hoy = aCampos(ahora).fecha;
  const [desdeFecha, setDesdeFecha] = useState(hoy);
  const [desdeHora, setDesdeHora] = useState('00:00');
  const [hastaFecha, setHastaFecha] = useState(hoy);
  const [hastaHora, setHastaHora] = useState('23:59');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    const desde = deCampos(desdeFecha, desdeHora);
    const hasta = deCampos(hastaFecha, hastaHora);
    if (!desde || !hasta) return setError('Elegí las fechas y revisá las horas (hh:mm).');
    if (hasta <= desde) return setError('El final tiene que ser después del comienzo.');
    agregar('blocks', { desde, hasta, motivo: motivo.trim() || undefined }, 'agenda.bloquear');
    setAbierto(false); setMotivo(''); setError(null);
  };

  return (
    <View style={{ gap: 10 }}>
      <TextoFuerte>Bloqueos (vacaciones, congresos…)</TextoFuerte>
      {vigentes.length === 0 ? <Texto color={colors.textMuted}>No hay bloqueos por delante.</Texto> : null}
      {vigentes.map((b) => (
        <View key={b.id} style={s.fila}>
          <View style={{ flex: 1 }}>
            <Texto>{fechaHoraCorta(b.desde)} a {fechaHoraCorta(b.hasta)}</Texto>
            {b.motivo ? <TextoChico>{b.motivo}</TextoChico> : null}
          </View>
          <BotonTexto texto="Quitar" onPress={() => actualizar('blocks', b.id, { archivedAt: ahoraISO() }, 'agenda.desbloquear')} />
        </View>
      ))}
      {abierto ? (
        <View style={s.form}>
          <View style={s.fila}>
            <View style={{ flex: 3 }}><CampoFecha etiqueta="Desde" value={desdeFecha} onChangeText={(v) => { setDesdeFecha(v); if ((deCampo(v) ?? '') > (deCampo(hastaFecha) ?? '')) setHastaFecha(v); }} /></View>
            <View style={{ flex: 2 }}><Campo etiqueta="Hora" value={desdeHora} onChangeText={setDesdeHora} placeholder="00:00" /></View>
          </View>
          <View style={s.fila}>
            <View style={{ flex: 3 }}><CampoFecha etiqueta="Hasta" value={hastaFecha} onChangeText={setHastaFecha} minimo={deCampo(desdeFecha) ?? undefined} /></View>
            <View style={{ flex: 2 }}><Campo etiqueta="Hora" value={hastaHora} onChangeText={setHastaHora} placeholder="23:59" /></View>
          </View>
          <Campo etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} placeholder="Vacaciones, congreso…" maxLength={120} />
          {error ? <Aviso tono="alerta" texto={error} /> : null}
          <Boton titulo="Bloquear" icono="lock-closed-outline" compacto onPress={guardar} />
          <Boton titulo="Cancelar" variante="contorno" compacto onPress={() => { setAbierto(false); setError(null); }} />
        </View>
      ) : <BotonTexto texto="+ Agregar un bloqueo" onPress={() => setAbierto(true)} />}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  form: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
});
