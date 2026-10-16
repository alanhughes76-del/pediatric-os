/** Cómo se ve el certificado (vista previa y lectura): encabezado de la marca, texto, lugar y fecha, firma. */
import { View, StyleSheet } from 'react-native';
import { LEYENDA_DIGITAL } from '@/lib/certificados';
import { colors, fonts } from '@/theme';
import { Texto, TextoChico } from '../Texto';
import { Marca } from '../Marca';
import { Etiqueta } from '../Etiqueta';

export function VistaCertificado({ titulo, cuerpo, lugarFecha, firma, anulado }: {
  titulo: string; cuerpo: string; lugarFecha: string; firma: string; anulado?: string | true;
}) {
  return (
    <View style={s.hoja}>
      <Marca />
      <View style={s.linea} />
      {anulado ? <Etiqueta tono="alerta" texto={typeof anulado === 'string' ? `Anulado · ${anulado}` : 'Anulado'} /> : null}
      <Texto style={s.titulo}>{titulo}</Texto>
      <Texto style={s.cuerpo}>{cuerpo}</Texto>
      <Texto style={s.fecha}>{lugarFecha}</Texto>
      <View style={s.firma}>
        <Texto style={s.trazo}>Dr. Alan Hughes</Texto>
        <TextoChico style={s.datos}>{firma}</TextoChico>
      </View>
      <TextoChico style={{ textAlign: 'center' }}>{LEYENDA_DIGITAL}</TextoChico>
    </View>
  );
}

const s = StyleSheet.create({
  hoja: { backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 14 },
  linea: { height: 2, backgroundColor: colors.primary },
  titulo: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.primary, textAlign: 'center' },
  cuerpo: { lineHeight: 27 },
  fecha: { textAlign: 'right' },
  firma: { alignItems: 'center', marginTop: 24, gap: 2 },
  trazo: { fontFamily: fonts.titleSemi, fontSize: 18, color: colors.primary },
  datos: { textAlign: 'center', borderTopWidth: 1, borderTopColor: colors.sky, paddingTop: 4 },
});
