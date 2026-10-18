/** Código QR dibujado con react-native-svg (para escanear la clave del segundo factor). */
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { modulosQR } from '@/lib/segundoFactor';

export function CodigoQR({ texto, tamano = 220, accessibilityLabel }: { texto: string; tamano?: number; accessibilityLabel: string }) {
  const { n, d } = useMemo(() => {
    const m = modulosQR(texto);
    // Un solo trazo con un cuadradito por módulo oscuro (más liviano que cientos de Rect).
    const partes: string[] = [];
    m.forEach((fila, f) => fila.forEach((oscuro, c) => { if (oscuro) partes.push(`M${c + 4} ${f + 4}h1v1h-1z`); }));
    return { n: m.length + 8, d: partes.join('') };
  }, [texto]);
  return (
    <Svg width={tamano} height={tamano} viewBox={`0 0 ${n} ${n}`} accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      <Rect x={0} y={0} width={n} height={n} fill="#FFFFFF" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}
