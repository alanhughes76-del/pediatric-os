/**
 * Estudios (prompt maestro 7.10): pedido con "Revisar resultado el", y el recorrido
 * solicitado → realizado → resultado recibido → revisado. La orden legal se emite en la plataforma
 * registrada, igual que las recetas. Adjuntar el resultado (PDF o imagen) llega en la Etapa 5b.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import type { Patient, StudyOrder } from '@/data/types';
import { estudiosDe, SIGUIENTE_ESTUDIO, TEXTO_ESTUDIO } from '@/data/seguimientoClinico';
import { aCampos, ahoraISO, deFecha, fechaCorta, hoyISO } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Campo } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { Agregar } from './piezas';
import { colors } from '@/theme';

const TONO: Record<StudyOrder['status'], 'neutro' | 'celeste' | 'naranja' | 'verde'> = { solicitado: 'neutro', realizado: 'celeste', resultado: 'naranja', revisado: 'verde' };
const BOTON: Record<'realizado' | 'resultado' | 'revisado', string> = { realizado: 'Marcar realizado', resultado: 'Llegó el resultado', revisado: 'Marcar revisado' };

export function BloqueEstudios({ paciente: p }: { paciente: Patient }) {
  const { db, agregar } = useApp();
  const lista = estudiosDe(db, p.id);
  const [e, setE] = useState({ study: '', reason: '', fecha: aCampos(ahoraISO()).fecha, revisar: '' });
  const [error, setError] = useState<string>();
  const poner = (k: keyof typeof e) => (v: string) => setE((x) => ({ ...x, [k]: v }));
  const limpiar = () => { setE({ study: '', reason: '', fecha: aCampos(ahoraISO()).fecha, revisar: '' }); setError(undefined); };

  return (
    <Seccion titulo="Estudios" bajada="La orden legal se emite en tu plataforma registrada">
      {lista.length === 0 ? <Texto color={colors.textMuted}>Sin estudios pedidos.</Texto> : null}
      {lista.map((x) => <TarjetaEstudio key={x.id} estudio={x} />)}
      <Agregar
        titulo="Pedir estudio"
        alCancelar={limpiar}
        guardar={() => {
          const pedido = deFecha(e.fecha);
          const revisar = e.revisar.trim() ? deFecha(e.revisar) : undefined;
          if (!e.study.trim()) { setError('Escribí el estudio.'); return false; }
          if (!pedido) { setError('Revisá la fecha del pedido (dd/mm/aaaa).'); return false; }
          if (revisar === null || (revisar && revisar < pedido)) { setError('Revisá "Revisar resultado el": tiene que ser posterior al pedido.'); return false; }
          agregar('studies', { patientId: p.id, study: e.study.trim(), reason: e.reason.trim() || undefined, orderedDate: pedido, reviewDate: revisar, status: 'solicitado', updatedAt: ahoraISO() }, 'estudio.pedir');
          limpiar();
          return true;
        }}
      >
        <Campo etiqueta="Estudio" value={e.study} onChangeText={poner('study')} placeholder="Hemograma, ecografía…" />
        <Campo etiqueta="Motivo (opcional)" value={e.reason} onChangeText={poner('reason')} />
        <View style={s.fila}>
          <View style={s.mitad}><Campo etiqueta="Fecha del pedido" value={e.fecha} onChangeText={poner('fecha')} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" /></View>
          <View style={s.mitad}><Campo etiqueta="Revisar resultado el (opcional)" value={e.revisar} onChangeText={poner('revisar')} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" /></View>
        </View>
        {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}
      </Agregar>
    </Seccion>
  );
}

function TarjetaEstudio({ estudio: x }: { estudio: StudyOrder }) {
  const { actualizar } = useApp();
  const hoy = hoyISO();
  const siguiente = SIGUIENTE_ESTUDIO[x.status];
  const vencido = x.status !== 'revisado' && !!x.reviewDate && x.reviewDate < hoy;
  const [nota, setNota] = useState(x.resultNote ?? '');
  const [cargando, setCargando] = useState(false);

  const avanzar = () => {
    if (siguiente === 'resultado' && !cargando) return setCargando(true);
    const ahora = ahoraISO();
    const cambios: Partial<StudyOrder> = { status: siguiente!, updatedAt: ahora };
    if (siguiente === 'resultado') { cambios.resultAt = ahora; cambios.resultNote = nota.trim() || undefined; }
    if (siguiente === 'revisado') cambios.reviewedAt = ahora;
    actualizar('studies', x.id, cambios, `estudio.${siguiente}`);
    setCargando(false);
  };

  return (
    <Tarjeta style={[{ gap: 6 }, vencido && x.status === 'resultado' && { borderColor: colors.alertBorder }]}>
      <View style={s.fila}>
        <TextoFuerte style={{ flex: 1 }}>{x.study}</TextoFuerte>
        <Etiqueta texto={TEXTO_ESTUDIO[x.status]} tono={TONO[x.status]} />
        {vencido && x.status === 'resultado' ? <Etiqueta texto="Revisión vencida" tono="alerta" /> : null}
      </View>
      <TextoChico>
        Pedido el {fechaCorta(x.orderedDate)}{x.reason ? ` · ${x.reason}` : ''}
        {x.reviewDate && x.status !== 'revisado' ? ` · Revisar el ${fechaCorta(x.reviewDate)}` : ''}
        {x.reviewedAt ? ` · Revisado el ${fechaCorta(x.reviewedAt)}` : ''}
      </TextoChico>
      {x.resultNote ? <Texto>Resultado: {x.resultNote}</Texto> : null}
      {cargando ? (
        <Campo etiqueta="Qué dice el resultado (opcional)" value={nota} onChangeText={setNota} multiline ayuda="Solo lo ves vos. El archivo se adjunta en la Etapa 5b." />
      ) : null}
      {siguiente ? (
        <View style={s.fila}>
          <View style={s.mitad}><Boton compacto variante={siguiente === 'revisado' ? 'principal' : 'secundario'} titulo={cargando ? 'Guardar el resultado' : BOTON[siguiente as keyof typeof BOTON]} onPress={avanzar} /></View>
          {cargando ? <View style={s.mitad}><Boton compacto variante="contorno" titulo="Cancelar" onPress={() => setCargando(false)} /></View> : null}
        </View>
      ) : null}
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  mitad: { flex: 1, minWidth: 140 },
});
