/**
 * Curva de temperatura: línea en 38 °C, puntos de 38 °C o más en rojo y los demás en azul,
 * y una marca por cada antitérmico (P = paracetamol, I = ibuprofeno, O = otro).
 */
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Polygon, Polyline, Circle, Text as SvgText, Rect } from 'react-native-svg';
import type { FeverEntry } from '@/data/types';
import { LETRA_DROGA, UMBRAL_FIEBRE } from '@/lib/fiebre';
import { fechaHoraCorta } from '@/lib/fechas';
import { colors, fonts } from '@/theme';
import { Texto, TextoChico } from '../Texto';

const ALTO = 230;
const M = { izq: 40, der: 14, arr: 30, abj: 34 };
/** Margen interno para que los puntos no queden pegados a los bordes. */
const PAD = 14;

export function GraficoFiebre({ registros }: { registros: FeverEntry[] }) {
  const [ancho, setAncho] = useState(0);
  const ordenados = [...registros].sort((a, b) => a.at.localeCompare(b.at));
  const tomas = ordenados.filter((r) => r.kind === 'toma' && r.temperatureC != null);
  const antitermicos = ordenados.filter((r) => r.kind === 'antitermico');

  if (tomas.length === 0) {
    return <View style={{ paddingVertical: 24, alignItems: 'center' }}><Texto color={colors.textMuted}>Todavía no hay temperaturas anotadas.</Texto></View>;
  }

  const t0 = Date.parse(ordenados[0].at);
  const t1 = Math.max(Date.parse(ordenados[ordenados.length - 1].at), t0 + 3600000);
  const temps = tomas.map((t) => t.temperatureC!);
  const yMin = Math.min(36, Math.floor(Math.min(...temps)));
  const yMax = Math.max(40, Math.ceil(Math.max(...temps)));

  const onLayout = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);
  const w = ancho - M.izq - M.der - PAD * 2;
  const h = ALTO - M.arr - M.abj;
  const px = (iso: string) => M.izq + PAD + ((Date.parse(iso) - t0) / (t1 - t0)) * w;
  const py = (c: number) => M.arr + h - ((c - yMin) / (yMax - yMin)) * h;
  const ticks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);

  return (
    <View style={{ gap: 8 }}>
      <View onLayout={onLayout} style={{ height: ALTO }}>
        {ancho > 0 ? (
          <Svg width={ancho} height={ALTO} accessibilityLabel="Curva de temperatura">
            {ticks.map((t) => (
              <Line key={t} x1={M.izq} x2={ancho - M.der} y1={py(t)} y2={py(t)} stroke={colors.border} strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText key={`l${t}`} x={M.izq - 6} y={py(t) + 4} fontSize={12} fill={t === UMBRAL_FIEBRE ? colors.alert : colors.textMuted} textAnchor="end" fontFamily={t === UMBRAL_FIEBRE ? fonts.bodyBold : fonts.body}>{t}</SvgText>
            ))}
            <Line x1={M.izq} x2={ancho - M.der} y1={py(UMBRAL_FIEBRE)} y2={py(UMBRAL_FIEBRE)} stroke={colors.alert} strokeWidth={1.5} strokeDasharray="6 4" />

            {antitermicos.map((a) => (
              <Line key={`v${a.id}`} x1={px(a.at)} x2={px(a.at)} y1={M.arr - 4} y2={ALTO - M.abj} stroke={colors.sky} strokeWidth={1} strokeDasharray="3 3" />
            ))}
            {antitermicos.map((a) => (
              <G key={`m${a.id}`}>
                <Rect x={px(a.at) - 10} y={4} width={20} height={20} rx={10} fill={colors.primary} />
                <SvgText x={px(a.at)} y={18} fontSize={12} fill={colors.white} textAnchor="middle" fontFamily={fonts.bodyBold}>{LETRA_DROGA[a.drug ?? 'otro']}</SvgText>
              </G>
            ))}

            <Polygon
              points={`${px(tomas[0].at)},${py(yMin)} ${tomas.map((t) => `${px(t.at)},${py(t.temperatureC!)}`).join(' ')} ${px(tomas[tomas.length - 1].at)},${py(yMin)}`}
              fill={colors.sky}
              fillOpacity={0.18}
            />
            <Polyline points={tomas.map((t) => `${px(t.at)},${py(t.temperatureC!)}`).join(' ')} fill="none" stroke={colors.primary3} strokeWidth={2} />
            {tomas.map((t) => {
              const fiebre = t.temperatureC! >= UMBRAL_FIEBRE;
              return <Circle key={t.id} cx={px(t.at)} cy={py(t.temperatureC!)} r={6} fill={fiebre ? colors.alert : colors.primary2} stroke={colors.white} strokeWidth={2} />;
            })}

            <SvgText x={M.izq} y={ALTO - 10} fontSize={12} fill={colors.textMuted} fontFamily={fonts.body}>{fechaHoraCorta(ordenados[0].at)}</SvgText>
            <SvgText x={ancho - M.der} y={ALTO - 10} fontSize={12} fill={colors.textMuted} textAnchor="end" fontFamily={fonts.body}>{fechaHoraCorta(ordenados[ordenados.length - 1].at)}</SvgText>
          </Svg>
        ) : null}
      </View>
      <TextoChico>Rojo: 38 °C o más. Azul: menos de 38 °C. P, I, O: paracetamol, ibuprofeno u otro antitérmico.</TextoChico>
    </View>
  );
}
