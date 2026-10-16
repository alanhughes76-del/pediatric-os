/**
 * Gráfico de peso, talla y perímetro cefálico en el tiempo.
 *
 * Eje X = edad en meses (no fecha calendario), así en una etapa posterior se pueden
 * superponer las curvas de percentiles (OMS 0-5 años y referencias SAP) sin rehacer
 * el gráfico: alcanza con pasar `curvasReferencia`.
 */
import { useState } from 'react';
import { View, Pressable, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, Path } from 'react-native-svg';
import type { GrowthMeasurement } from '@/data/types';
import { edadEnMeses } from '@/lib/edad';
import { fechaCorta } from '@/lib/fechas';
import { colors, fonts, size } from '@/theme';
import { Texto, TextoChico } from './Texto';

type Variable = 'weightKg' | 'heightCm' | 'headCm';

const VARIABLES: { clave: Variable; nombre: string; unidad: string; decimales: number }[] = [
  { clave: 'weightKg', nombre: 'Peso', unidad: 'kg', decimales: 2 },
  { clave: 'heightCm', nombre: 'Talla', unidad: 'cm', decimales: 1 },
  { clave: 'headCm', nombre: 'Perímetro cefálico', unidad: 'cm', decimales: 1 },
];

/** Curva de referencia (percentil) para una etapa posterior. */
export interface CurvaReferencia {
  etiqueta: string; // "P50"
  puntos: { meses: number; valor: number }[];
}

interface P {
  mediciones: GrowthMeasurement[];
  fechaNacimiento: string;
  /** Reservado para percentiles (OMS / SAP). Todavía no se usa. */
  curvasReferencia?: Partial<Record<Variable, CurvaReferencia[]>>;
}

const ALTO = 220;
const M = { izq: 44, der: 14, arr: 14, abj: 34 };

const num = (n: number, dec: number) => n.toFixed(dec).replace('.', ',').replace(/,?0+$/, '');

export function GraficoMediciones({ mediciones, fechaNacimiento }: P) {
  const [variable, setVariable] = useState<Variable>('weightKg');
  const [ancho, setAncho] = useState(0);
  const def = VARIABLES.find((v) => v.clave === variable)!;

  const puntos = mediciones
    .filter((m) => m[variable] != null)
    .map((m) => ({ x: edadEnMeses(fechaNacimiento, m.measuredAt), y: m[variable] as number, fecha: m.measuredAt }));

  const onLayout = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);

  return (
    <View style={{ gap: 12 }}>
      <View style={s.selector} accessibilityRole="tablist">
        {VARIABLES.map((v) => {
          const activo = v.clave === variable;
          return (
            <Pressable
              key={v.clave}
              onPress={() => setVariable(v.clave)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              style={[s.opcion, activo && s.opcionActiva]}
            >
              <Text style={[s.opcionTexto, activo && { color: colors.white }]} numberOfLines={1}>
                {v.clave === 'headCm' ? 'P. cefálico' : v.nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View onLayout={onLayout} style={{ height: ALTO }}>
        {puntos.length === 0 ? (
          <View style={s.vacio}><Texto color={colors.textMuted}>Todavía no hay mediciones de {def.nombre.toLowerCase()}.</Texto></View>
        ) : ancho > 0 ? (
          <Lienzo puntos={puntos} ancho={ancho} unidad={def.unidad} />
        ) : null}
      </View>

      {puntos.length > 0 ? (
        <View style={s.ultima}>
          <TextoChico>Última medición ({fechaCorta(puntos[puntos.length - 1].fecha)})</TextoChico>
          <Texto style={s.valor}>
            {num(puntos[puntos.length - 1].y, def.decimales)} {def.unidad}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

function Lienzo({ puntos, ancho, unidad }: { puntos: { x: number; y: number }[]; ancho: number; unidad: string }) {
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const xMax = Math.max(1, Math.ceil(Math.max(...xs)));
  const rangoY = Math.max(...ys) - Math.min(...ys) || 1;
  const yMin = Math.max(0, Math.floor(Math.min(...ys) - rangoY * 0.1));
  const yMax = Math.ceil(Math.max(...ys) + rangoY * 0.1);

  const w = ancho - M.izq - M.der;
  const h = ALTO - M.arr - M.abj;
  const px = (x: number) => M.izq + (x / xMax) * w;
  const py = (y: number) => M.arr + h - ((y - yMin) / (yMax - yMin || 1)) * h;

  const ticksY = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  const pasoX = xMax <= 3 ? 0.5 : xMax <= 12 ? 2 : xMax <= 24 ? 3 : 6;
  const ticksX: number[] = [];
  for (let x = 0; x <= xMax + 0.001; x += pasoX) ticksX.push(x);

  const etiquetaX = (x: number) => (xMax <= 3 ? `${Math.round(x * 4.35)} sem` : x >= 24 && x % 12 === 0 ? `${x / 12} a` : `${x} m`);

  const linea = puntos.map((p) => `${px(p.x)},${py(p.y)}`).join(' ');
  const area = `M${px(puntos[0].x)},${py(yMin)} L${puntos.map((p) => `${px(p.x)},${py(p.y)}`).join(' L')} L${px(puntos[puntos.length - 1].x)},${py(yMin)} Z`;

  return (
    <Svg width={ancho} height={ALTO} accessibilityLabel={`Gráfico de ${unidad} por edad`}>
      {ticksY.map((t) => (
        <Line key={`gy${t}`} x1={M.izq} x2={ancho - M.der} y1={py(t)} y2={py(t)} stroke={colors.border} strokeWidth={1} />
      ))}
      {ticksY.map((t) => (
        <SvgText key={`ty${t}`} x={M.izq - 6} y={py(t) + 4} fontSize={12} fill={colors.textMuted} textAnchor="end" fontFamily={fonts.body}>
          {Number.isInteger(t) ? t : t.toFixed(1).replace('.', ',')}
        </SvgText>
      ))}
      {ticksX.map((t) => (
        <SvgText key={`tx${t}`} x={px(t)} y={ALTO - 12} fontSize={12} fill={colors.textMuted} textAnchor="middle" fontFamily={fonts.body}>
          {etiquetaX(t)}
        </SvgText>
      ))}
      <SvgText x={M.izq} y={ALTO - 0} fontSize={11} fill={colors.textMuted} fontFamily={fonts.body}>
        Edad
      </SvgText>
      <Path d={area} fill={colors.bgSoft} />
      <Polyline points={linea} fill="none" stroke={colors.primary2} strokeWidth={2.5} strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <Circle key={i} cx={px(p.x)} cy={py(p.y)} r={4.5} fill={colors.white} stroke={colors.primary} strokeWidth={2} />
      ))}
    </Svg>
  );
}

const s = StyleSheet.create({
  selector: { flexDirection: 'row', backgroundColor: colors.bgSoft, borderRadius: 999, padding: 4, gap: 4 },
  opcion: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  opcionActiva: { backgroundColor: colors.primary },
  opcionTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ultima: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  valor: { fontFamily: fonts.bodyBold, fontSize: size.large, color: colors.primary },
});
