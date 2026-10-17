/**
 * Tarjeta Crecimiento: curvas P3 a P97 con los puntos del paciente.
 * - Médico: peso, talla, PC, IMC y peso/talla; selector de referencia (OMS/SAP) cuando existe;
 *   Z y avisos; tabla por visita.
 * - Familia: peso, talla y PC con las bandas y sus puntos. Sin Z, sin avisos y sin tabla.
 * Los cálculos salen del motor puro (lib/percentiles.ts y lib/crecimiento.ts).
 */
import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, G } from 'react-native-svg';
import { useApp } from '@/data/store';
import { medicionesDe } from '@/data/selectores';
import type { Patient } from '@/data/types';
import { filasDeCrecimiento, sexoDeReferencia, type FilaCrecimiento, type Medida } from '@/lib/crecimiento';
import { CURVAS, INDICADORES, TEXTO_AVISO, TEXTO_MOTIVO, curva, formatoPercentil, formatoZ, type Indicador, type Referencia } from '@/lib/percentiles';
import { edades, edadEnMeses } from '@/lib/edad';
import { fechaCorta, hoyISO } from '@/lib/fechas';
import { Opciones, Aviso } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { colors, fonts } from '@/theme';

type Rango = '0-2' | '0-5' | '2-19';
const RANGOS: { valor: Rango; texto: string; desde: number; hasta: number }[] = [
  { valor: '0-2', texto: '0–2 años', desde: 0, hasta: 24 },
  { valor: '0-5', texto: '0–5 años', desde: 0, hasta: 60 },
  { valor: '2-19', texto: '2–19 años', desde: 24, hasta: 228 },
];

const ALTO = 280;
const M = { izq: 40, der: 34, arr: 12, abj: 30 };
/** P3 y P97 en un tono de alerta suave (sin rojo fuerte). */
const COLOR_EXTREMOS = '#E3A49C';

const decimales = (ind: Indicador) => (ind === 'peso' || ind === 'peso-talla' ? 2 : 1);
const num = (n: number, dec: number) => n.toFixed(dec).replace('.', ',');

function medidaDe(f: FilaCrecimiento, ind: Indicador): Medida | undefined {
  return ind === 'peso' ? f.peso : ind === 'talla' ? f.talla : ind === 'pc' ? f.pc : ind === 'imc' ? f.imc : f.pesoTalla;
}

export function TarjetaCrecimiento({ paciente: p, vista }: { paciente: Patient; vista: 'medico' | 'familia' }) {
  const { db, actualizar } = useApp();
  const esMedico = vista === 'medico';
  const indicadores = INDICADORES.filter((i) => esMedico || i.clave === 'peso' || i.clave === 'talla' || i.clave === 'pc');
  const edadActual = edades(p).cronologica;
  const [ind, setInd] = useState<Indicador>('peso');
  const [rango, setRango] = useState<Rango>(() => {
    const meses = edadEnMeses(p.birthDate, hoyISO());
    return meses < 24 ? '0-2' : meses < 60 ? '0-5' : '2-19';
  });
  const [ref, setRef] = useState<'auto' | Referencia>('auto');
  const [elegido, setElegido] = useState<string | null>(null);

  const sexo = sexoDeReferencia(p);
  const referencia = ref === 'auto' ? undefined : ref;
  const mediciones = medicionesDe(db, p.id);
  const filas = useMemo(() => filasDeCrecimiento(p, mediciones, referencia), [p, mediciones, referencia]);
  const def = INDICADORES.find((i) => i.clave === ind)!;
  const r = RANGOS.find((x) => x.valor === rango)!;
  const tieneOtraReferencia = esMedico && (ind === 'peso' || ind === 'talla');

  return (
    <View style={{ gap: 12 }}>
      {p.sex === 'X' ? (
        esMedico ? (
          <Opciones
            etiqueta="Sexo X: ¿con qué referencia comparamos?"
            opciones={[{ valor: 'M', texto: 'Varón' }, { valor: 'F', texto: 'Mujer' }]}
            valor={p.growthReferenceSex}
            onCambio={(v) => actualizar('patients', p.id, { growthReferenceSex: v }, 'paciente.referencia-crecimiento')}
          />
        ) : !sexo ? (
          <Texto color={colors.textMuted}>Las curvas aparecen cuando el Dr. elija la referencia.</Texto>
        ) : null
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityRole="tablist">
        {indicadores.map((i) => (
          <Chip key={i.clave} texto={i.corto} activo={i.clave === ind} onPress={() => { setInd(i.clave); setElegido(null); }} />
        ))}
      </ScrollView>
      {ind !== 'peso-talla' ? (
        <View style={s.chips}>
          {RANGOS.map((x) => <Chip key={x.valor} chico texto={x.texto} activo={x.valor === rango} onPress={() => { setRango(x.valor); setElegido(null); }} />)}
        </View>
      ) : (
        <View style={s.chips}>
          <Chip chico texto="Acostado (45–110 cm)" activo={rango === '0-2'} onPress={() => setRango('0-2')} />
          <Chip chico texto="De pie (65–120 cm)" activo={rango !== '0-2'} onPress={() => setRango('0-5')} />
        </View>
      )}
      {tieneOtraReferencia ? (
        <View style={s.chips}>
          <Chip chico texto="Según la edad" activo={ref === 'auto'} onPress={() => setRef('auto')} />
          <Chip chico texto="OMS" activo={ref === 'OMS'} onPress={() => setRef('OMS')} />
          <Chip chico texto="SAP/Lejarraga" activo={ref === 'SAP'} onPress={() => setRef('SAP')} />
        </View>
      ) : null}

      {sexo ? (
        <Grafico
          ind={ind}
          sexo={sexo}
          filas={filas}
          rango={r}
          referencia={referencia}
          elegido={elegido}
          onElegir={setElegido}
        />
      ) : null}

      <TextoChico>
        {def.nombre} · {ind === 'peso' || ind === 'talla'
          ? ref === 'auto' ? 'OMS hasta 5 años, después SAP/Lejarraga' : ref === 'OMS' ? 'OMS' : 'SAP/Lejarraga'
          : 'OMS'}. Curvas P3, P10, P25, P50, P75, P90 y P97.
        {filas.some((f) => f.corregida) ? ' Puntos huecos: calculados con edad corregida.' : ''}
      </TextoChico>

      <Detalle filas={filas} ind={ind} elegido={elegido} esMedico={esMedico} paciente={p} unidad={def.unidad} />

      {esMedico ? <TablaPorVisita filas={filas} paciente={p} /> : null}
      {!esMedico ? <TextoChico>Edad actual: {edadActual}</TextoChico> : null}
    </View>
  );
}

function Chip({ texto, activo, onPress, chico = false }: { texto: string; activo: boolean; onPress: () => void; chico?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: activo }} style={[s.chip, chico && s.chipChico, activo && s.chipActivo]}>
      <Text style={[s.chipTexto, chico && { fontSize: 14 }, activo && { color: colors.white }]}>{texto}</Text>
    </Pressable>
  );
}

// ---------- Gráfico ----------

function Grafico({ ind, sexo, filas, rango, referencia, elegido, onElegir }: {
  ind: Indicador;
  sexo: 'M' | 'F';
  filas: FilaCrecimiento[];
  rango: { valor: Rango; desde: number; hasta: number };
  referencia?: Referencia;
  elegido: string | null;
  onElegir: (id: string | null) => void;
}) {
  const [ancho, setAncho] = useState(0);
  const pesoTalla = ind === 'peso-talla';
  const acostado = rango.valor === '0-2';
  const xMin = pesoTalla ? (acostado ? 45 : 65) : rango.desde;
  const xMax = pesoTalla ? (acostado ? 110 : 120) : rango.hasta;
  const mesesParaTabla = acostado ? 0 : 24;

  const xs = useMemo(() => Array.from({ length: 61 }, (_, i) => xMin + ((xMax - xMin) * i) / 60), [xMin, xMax]);
  const curvas = useMemo(
    () => CURVAS.map((c) => ({ ...c, puntos: curva(ind, sexo, c.z, xs, { referencia, mesesParaTabla }) })),
    [ind, sexo, xs, referencia, mesesParaTabla],
  );

  const puntos = filas
    .map((f) => {
      const m = medidaDe(f, ind);
      if (!m || !m.resultado.ok || f.meses == null) return null;
      const x = pesoTalla ? (f.talla?.resultado.ok ? f.talla.resultado.valorUsado : f.medicion.heightCm ?? 0) : f.meses;
      const y = ind === 'talla' ? m.resultado.valorUsado : m.valor;
      return x >= xMin && x <= xMax ? { id: f.medicion.id, x, y, hueco: f.corregida } : null;
    })
    .filter((x): x is { id: string; x: number; y: number; hueco: boolean } => x !== null);

  const todosY = [...curvas.flatMap((c) => c.puntos.map((p) => p.y)), ...puntos.map((p) => p.y)];
  if (todosY.length === 0) {
    return <View style={s.vacio}><Texto color={colors.textMuted}>Sin referencia para este rango.</Texto></View>;
  }
  const yMinRaw = Math.min(...todosY);
  const yMaxRaw = Math.max(...todosY);
  const pad = (yMaxRaw - yMinRaw) * 0.05 || 1;
  const yMin = Math.max(0, yMinRaw - pad);
  const yMax = yMaxRaw + pad;

  const w = ancho - M.izq - M.der;
  const h = ALTO - M.arr - M.abj;
  const px = (x: number) => M.izq + ((x - xMin) / (xMax - xMin)) * w;
  const py = (y: number) => M.arr + h - ((y - yMin) / (yMax - yMin)) * h;

  const pasoY = niceStep((yMax - yMin) / 5);
  const ticksY: number[] = [];
  for (let y = Math.ceil(yMin / pasoY) * pasoY; y <= yMax; y += pasoY) ticksY.push(Number(y.toFixed(4)));
  const pasoX = pesoTalla ? 10 : rango.valor === '0-2' ? 3 : rango.valor === '0-5' ? 6 : 24;
  const ticksX: number[] = [];
  for (let x = Math.ceil(xMin / pasoX) * pasoX; x <= xMax; x += pasoX) ticksX.push(x);
  const etiquetaX = (x: number) => (pesoTalla ? `${x}` : x % 12 === 0 && x > 0 ? `${x / 12}a` : `${x}m`);

  const onLayout = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={{ height: ALTO }}>
      {ancho > 0 ? (
        <Svg width={ancho} height={ALTO} accessibilityLabel="Gráfico de crecimiento con percentilos">
          {ticksY.map((t) => <Line key={`gy${t}`} x1={M.izq} x2={ancho - M.der} y1={py(t)} y2={py(t)} stroke={colors.border} strokeWidth={1} />)}
          {ticksY.map((t) => (
            <SvgText key={`ty${t}`} x={M.izq - 5} y={py(t) + 4} fontSize={11} fill={colors.textMuted} textAnchor="end" fontFamily={fonts.body}>
              {Number.isInteger(t) ? t : String(t).replace('.', ',')}
            </SvgText>
          ))}
          {ticksX.map((t) => (
            <SvgText key={`tx${t}`} x={px(t)} y={ALTO - 10} fontSize={11} fill={colors.textMuted} textAnchor="middle" fontFamily={fonts.body}>{etiquetaX(t)}</SvgText>
          ))}
          <SvgText x={ancho - M.der} y={ALTO - 10} fontSize={10} fill={colors.textMuted} textAnchor="start" fontFamily={fonts.body}>{pesoTalla ? ' cm' : ''}</SvgText>

          {curvas.map((c) => {
            if (c.puntos.length < 2) return null;
            const extremo = c.p === 3 || c.p === 97;
            const color = c.p === 50 ? colors.primary2 : extremo ? COLOR_EXTREMOS : colors.sky;
            const ultimo = c.puntos[c.puntos.length - 1];
            return (
              <G key={c.p}>
                <Polyline points={c.puntos.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} fill="none" stroke={color} strokeWidth={c.p === 50 ? 2.5 : extremo ? 1.6 : 1.1} />
                <SvgText x={px(ultimo.x) + 3} y={py(ultimo.y) + 4} fontSize={10} fill={c.p === 50 ? colors.primary2 : colors.textMuted} fontFamily={fonts.bodySemi}>P{c.p}</SvgText>
              </G>
            );
          })}

          {puntos.length > 1 ? (
            <Polyline points={puntos.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} fill="none" stroke={colors.primary} strokeWidth={2} />
          ) : null}
          {puntos.map((p) => (
            <Circle key={p.id} cx={px(p.x)} cy={py(p.y)} r={p.id === elegido ? 7 : 5} fill={p.hueco ? colors.white : colors.primary} stroke={colors.primary} strokeWidth={2} />
          ))}
        </Svg>
      ) : null}
      {/* Áreas tocables sobre cada punto (funcionan igual en el teléfono y en la web). */}
      {ancho > 0 ? puntos.map((p) => (
        <Pressable
          key={`t${p.id}`}
          onPress={() => onElegir(p.id === elegido ? null : p.id)}
          accessibilityRole="button"
          accessibilityLabel="Ver el detalle de esta medición"
          style={[s.toque, { left: px(p.x) - 16, top: py(p.y) - 16 }]}
        />
      )) : null}
    </View>
  );
}

function niceStep(bruto: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / exp;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * exp;
}

// ---------- Detalle del punto tocado ----------

function Detalle({ filas, ind, elegido, esMedico, paciente, unidad }: {
  filas: FilaCrecimiento[]; ind: Indicador; elegido: string | null; esMedico: boolean; paciente: Patient; unidad: string;
}) {
  const f = filas.find((x) => x.medicion.id === elegido);
  if (!f) return <TextoChico>Tocá un punto para ver la fecha, la edad, el valor y el percentilo.</TextoChico>;
  const m = medidaDe(f, ind);
  if (!m) return null;
  const e = edades(paciente, f.fecha, esMedico ? 'abreviado' : 'escrito');
  const r = m.resultado;
  return (
    <View style={s.detalle}>
      <TextoFuerte>{fechaCorta(f.fecha)} · {e.cronologica}{f.corregida && e.corregida ? ` (corregida ${e.corregida})` : ''}</TextoFuerte>
      <Texto>
        {num(m.valor, decimales(ind))} {unidad}
        {r.ok ? ` · ${formatoPercentil(r.percentil)}${esMedico ? ` · Z ${formatoZ(r.z)}` : ''}` : ''}
      </Texto>
      {esMedico && ind === 'talla' && r.ok && r.valorUsado !== m.valor ? (
        <TextoChico>Medida {f.posicion === 'de_pie' ? 'de pie' : 'acostado'}: se corrigió a {num(r.valorUsado, 1)} cm para comparar.</TextoChico>
      ) : null}
      {esMedico && r.ok && r.aviso ? <Aviso tono="alerta" texto={TEXTO_AVISO[r.aviso]} /> : null}
      {!r.ok ? <TextoChico>{TEXTO_MOTIVO[r.motivo]}</TextoChico> : null}
    </View>
  );
}

// ---------- Tabla por visita (solo médico) ----------

function Celda({ m, dec, unidad }: { m?: Medida; dec: number; unidad: string }) {
  if (!m) return <Text style={s.celda}>—</Text>;
  const r = m.resultado;
  const alerta = r.ok && !!r.aviso;
  return (
    <View style={s.celdaCaja}>
      <Text style={[s.celda, alerta && { color: colors.alert }]}>{num(m.valor, dec)} {unidad}</Text>
      <Text style={[s.celdaP, alerta && { color: colors.alert }]}>
        {r.ok ? `${formatoPercentil(r.percentil)}${alerta ? ' ⚠' : ''}` : 'fuera de rango'}
      </Text>
    </View>
  );
}

function TablaPorVisita({ filas, paciente }: { filas: FilaCrecimiento[]; paciente: Patient }) {
  if (filas.length === 0) return <Texto color={colors.textMuted}>Todavía no hay mediciones.</Texto>;
  const avisos = filas.flatMap((f) =>
    (['peso', 'talla', 'pc', 'imc', 'peso-talla'] as Indicador[]).flatMap((ind) => {
      const m = medidaDe(f, ind);
      return m?.resultado.ok && m.resultado.aviso ? [`${fechaCorta(f.fecha)} · ${INDICADORES.find((i) => i.clave === ind)!.corto}: ${TEXTO_AVISO[m.resultado.aviso]}`] : [];
    }));
  const ordenadas = [...filas].reverse();

  return (
    <View style={{ gap: 8 }}>
      <TextoFuerte>Por visita</TextoFuerte>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[s.filaTabla, s.cabecera]}>
            {['Fecha', 'Edad', 'Peso', 'Talla', 'PC', 'IMC'].map((t) => <Text key={t} style={[s.columna, s.cabeceraTexto]}>{t}</Text>)}
          </View>
          {ordenadas.map((f) => (
            <View key={f.medicion.id} style={s.filaTabla}>
              <View style={s.columna}><Text style={s.celda}>{fechaCorta(f.fecha)}</Text></View>
              <View style={s.columna}>
                <Text style={s.celda}>{edades(paciente, f.fecha, 'abreviado').cronologica}</Text>
                {f.corregida ? <Text style={s.celdaP}>edad corregida</Text> : null}
              </View>
              <View style={s.columna}><Celda m={f.peso} dec={2} unidad="kg" /></View>
              <View style={s.columna}><Celda m={f.talla} dec={1} unidad="cm" /></View>
              <View style={s.columna}><Celda m={f.pc} dec={1} unidad="cm" /></View>
              <View style={s.columna}><Celda m={f.imc} dec={1} unidad="" /></View>
            </View>
          ))}
        </View>
      </ScrollView>
      {avisos.map((a) => <TextoChico key={a} color={colors.alert}>{a}</TextoChico>)}
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary3, backgroundColor: colors.white, justifyContent: 'center' },
  chipChico: { minHeight: 36, paddingHorizontal: 10 },
  chipActivo: { backgroundColor: colors.accion, borderColor: colors.accion },
  chipTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary },
  vacio: { height: 120, alignItems: 'center', justifyContent: 'center' },
  toque: { position: 'absolute', width: 32, height: 32, borderRadius: 16 },
  detalle: { gap: 4, backgroundColor: colors.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  filaTabla: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  cabecera: { borderBottomWidth: 2, borderBottomColor: colors.primary3 },
  cabeceraTexto: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  columna: { width: 92, paddingRight: 8 },
  celdaCaja: { gap: 1 },
  celda: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  celdaP: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary2 },
});
