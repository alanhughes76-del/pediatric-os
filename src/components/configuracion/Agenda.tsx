/**
 * Agenda: horarios por día, duración por tipo de visita, buffer de traslado y zonas de cobertura.
 * Los bloqueos (vacaciones, congresos) se cargan en la Agenda.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { TEXTO_TIPO_TURNO, TIPOS_TURNO, type Franja, type TipoTurno } from '@shared/agenda';
import { armarAgenda, DIAS, ORDEN_DIAS as ORDEN } from '@/data/configuracion';
import { Campo } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { BotonTexto } from '../ficha/piezas';
import { PieGuardar, useGuardarAjuste } from './comun';
import { colors } from '@/theme';

export function Agenda() {
  const { db } = useApp();
  const a = db.agenda;
  const [horarios, setHorarios] = useState<Record<number, Franja[]>>(() => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [...(a.horarios[d] ?? [])]])));
  const [duraciones, setDuraciones] = useState<Record<TipoTurno, string>>(() => Object.fromEntries(TIPOS_TURNO.map((t) => [t, String(a.duracionMin[t])])) as Record<TipoTurno, string>);
  const [buffer, setBuffer] = useState(String(a.bufferMin));
  const [zonas, setZonas] = useState(() => a.zonas.map((z) => ({ nombre: z.nombre, localidades: z.localidades.join(', ') })));
  const { guardando, mensaje, guardar } = useGuardarAjuste();

  const cambiarFranja = (d: number, i: number, campo: keyof Franja, v: string) =>
    setHorarios((h) => ({ ...h, [d]: h[d].map((f, j) => (j === i ? { ...f, [campo]: v } : f)) }));

  const enviar = () => {
    const r = armarAgenda({ horarios, duraciones, buffer, zonas });
    if (typeof r === 'string') return void guardar({ clave: 'agenda', datos: a }, r);
    void guardar({ clave: 'agenda', datos: r });
  };

  return (
    <>
      <TextoFuerte>Horarios de atención</TextoFuerte>
      {ORDEN.map((d) => (
        <View key={d} style={s.dia}>
          <View style={s.fila}>
            <Texto style={{ flex: 1, fontWeight: '600' }}>{DIAS[d]}</Texto>
            {horarios[d].length === 0 ? <TextoChico>No atendés</TextoChico> : null}
            <BotonTexto texto="+ Franja" onPress={() => setHorarios((h) => ({ ...h, [d]: [...h[d], { desde: '09:00', hasta: '13:00' }] }))} />
          </View>
          {horarios[d].map((f, i) => (
            <View key={i} style={s.fila}>
              <View style={{ flex: 1 }}><Campo value={f.desde} onChangeText={(v) => cambiarFranja(d, i, 'desde', v)} placeholder="09:00" accessibilityLabel={`${DIAS[d]}, desde`} /></View>
              <Texto>a</Texto>
              <View style={{ flex: 1 }}><Campo value={f.hasta} onChangeText={(v) => cambiarFranja(d, i, 'hasta', v)} placeholder="13:00" accessibilityLabel={`${DIAS[d]}, hasta`} /></View>
              <BotonTexto texto="Quitar" onPress={() => setHorarios((h) => ({ ...h, [d]: h[d].filter((_, j) => j !== i) }))} />
            </View>
          ))}
        </View>
      ))}

      <TextoFuerte>Duración de cada visita (minutos)</TextoFuerte>
      <View style={s.grilla}>
        {TIPOS_TURNO.map((t) => (
          <View key={t} style={{ flexBasis: 150, flexGrow: 1 }}>
            <Campo etiqueta={TEXTO_TIPO_TURNO[t]} value={duraciones[t]} keyboardType="numeric" onChangeText={(v) => setDuraciones((x) => ({ ...x, [t]: v }))} />
          </View>
        ))}
      </View>
      <Campo etiqueta="Buffer de traslado entre visitas (minutos)" value={buffer} onChangeText={setBuffer} keyboardType="numeric" />

      <TextoFuerte>Zonas de cobertura</TextoFuerte>
      <TextoChico>Las localidades o barrios, separados por comas: la agenda reconoce la zona por la dirección.</TextoChico>
      {zonas.map((z, i) => (
        <View key={i} style={s.dia}>
          <View style={s.fila}>
            <View style={{ flex: 1 }}><Campo etiqueta="Nombre" value={z.nombre} onChangeText={(v) => setZonas((xs) => xs.map((x, j) => (j === i ? { ...x, nombre: v } : x)))} /></View>
            <BotonTexto texto="Quitar" onPress={() => setZonas((xs) => xs.filter((_, j) => j !== i))} />
          </View>
          <Campo etiqueta="Localidades" value={z.localidades} multiline onChangeText={(v) => setZonas((xs) => xs.map((x, j) => (j === i ? { ...x, localidades: v } : x)))} />
        </View>
      ))}
      <BotonTexto texto="+ Agregar una zona" onPress={() => setZonas((xs) => [...xs, { nombre: '', localidades: '' }])} />

      <PieGuardar guardando={guardando} mensaje={mensaje} onGuardar={enviar} />
    </>
  );
}

const s = StyleSheet.create({
  dia: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
