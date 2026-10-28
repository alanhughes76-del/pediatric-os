/**
 * Campo de fecha con calendario (pedido del Dr., 18/10/2026): al tocarlo se abre un calendario para
 * elegir día, mes y año, en lugar de escribir la fecha. Anda igual en la web y en el teléfono.
 * - Tocando "octubre 2026" se elige el año y después el mes (cómodo para fechas de nacimiento).
 * - `minimo` / `maximo` ('AAAA-MM-DD') apagan los días fuera de rango (por ejemplo, nada futuro).
 * - El valor sigue siendo "dd/mm/aaaa", como el campo de texto que reemplaza.
 */
import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aCampo, celdasDelMes, deCampo, dentro, DIAS_CORTOS, fechaParaLeer, isoDe, MESES, moverMes } from '@/lib/calendario';
import { hoyISO } from '@/lib/fechas';
import { anilloFoco, colors, fonts, size } from '@/theme';
import { TextoChico } from './Texto';

interface P {
  etiqueta?: string;
  /** "dd/mm/aaaa" o vacío. */
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  ayuda?: string;
  minimo?: string;
  maximo?: string;
  /** Muestra "Borrar la fecha" (para fechas opcionales). */
  opcional?: boolean;
  accessibilityLabel?: string;
}

type Vista = 'dias' | 'anios' | 'meses';

export function CampoFecha({ etiqueta, value, onChangeText, error, ayuda, minimo, maximo, opcional, accessibilityLabel }: P) {
  const hoy = hoyISO();
  const elegida = deCampo(value);
  const base = elegida ?? (maximo && hoy > maximo ? maximo : minimo && hoy < minimo ? minimo : hoy);
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>('dias');
  const [anio, setAnio] = useState(Number(base.slice(0, 4)));
  const [mes, setMes] = useState(Number(base.slice(5, 7)) - 1);

  const abrir = () => {
    setAnio(Number(base.slice(0, 4)));
    setMes(Number(base.slice(5, 7)) - 1);
    setVista('dias');
    setAbierto(true);
  };
  const elegir = (iso: string) => { onChangeText(aCampo(iso)); setAbierto(false); };

  const anioHoy = Number(hoy.slice(0, 4));
  const desde = minimo ? Number(minimo.slice(0, 4)) : anioHoy - 25;
  const hasta = maximo ? Number(maximo.slice(0, 4)) : anioHoy + 5;
  const anios = Array.from({ length: Math.max(1, hasta - desde + 1) }, (_, i) => hasta - i);
  const mesAnterior = moverMes(anio, mes, -1);
  const mesSiguiente = moverMes(anio, mes, 1);
  const puedeAtras = !minimo || isoDe(mesAnterior.anio, mesAnterior.mes, 31) >= minimo.slice(0, 8) + '01';
  const puedeAdelante = !maximo || isoDe(mesSiguiente.anio, mesSiguiente.mes, 1) <= maximo;

  return (
    <View style={{ gap: 6, flexShrink: 1 }}>
      {etiqueta ? <Text style={s.etiqueta}>{etiqueta}</Text> : null}
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel ?? etiqueta ?? 'Fecha'}: ${elegida ? fechaParaLeer(elegida) : 'sin elegir'}. Tocá para abrir el calendario.`}
        style={(e) => [s.campo, error ? s.campoError : null, (e as { focused?: boolean }).focused && anilloFoco]}
      >
        <Text style={[s.valor, !value && { color: colors.textMuted }]}>{value || 'Elegí la fecha'}</Text>
        <Ionicons name="calendar-outline" size={22} color={colors.primary2} />
      </Pressable>
      {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : ayuda ? <TextoChico>{ayuda}</TextoChico> : null}

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={s.fondo} onPress={() => setAbierto(false)} accessibilityLabel="Cerrar el calendario">
          <Pressable style={s.tarjeta} onPress={() => undefined} accessibilityViewIsModal>
            <View style={s.cabecera}>
              {vista === 'dias' ? (
                <Pressable onPress={() => puedeAtras && (setAnio(mesAnterior.anio), setMes(mesAnterior.mes))} disabled={!puedeAtras}
                  accessibilityRole="button" accessibilityLabel="Mes anterior" style={[s.flecha, !puedeAtras && { opacity: 0.3 }]}>
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </Pressable>
              ) : <View style={s.flecha} />}
              <Pressable onPress={() => setVista(vista === 'dias' ? 'anios' : 'dias')} accessibilityRole="button"
                accessibilityLabel={vista === 'dias' ? `${MESES[mes]} de ${anio}. Tocá para elegir el año` : 'Volver a los días'} style={s.titulo}>
                <Text style={s.tituloTexto}>{vista === 'anios' ? 'Elegí el año' : vista === 'meses' ? `${anio} · elegí el mes` : `${MESES[mes]} ${anio}`}</Text>
                <Ionicons name={vista === 'dias' ? 'chevron-down' : 'chevron-up'} size={18} color={colors.primary} />
              </Pressable>
              {vista === 'dias' ? (
                <Pressable onPress={() => puedeAdelante && (setAnio(mesSiguiente.anio), setMes(mesSiguiente.mes))} disabled={!puedeAdelante}
                  accessibilityRole="button" accessibilityLabel="Mes siguiente" style={[s.flecha, !puedeAdelante && { opacity: 0.3 }]}>
                  <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                </Pressable>
              ) : <View style={s.flecha} />}
            </View>

            {vista === 'dias' ? (
              <>
                <View style={s.semana}>
                  {DIAS_CORTOS.map((d, i) => <Text key={i} style={s.diaSemana}>{d}</Text>)}
                </View>
                <View style={s.grilla}>
                  {celdasDelMes(anio, mes).map((d, i) => {
                    if (d === null) return <View key={i} style={s.celda} />;
                    const iso = isoDe(anio, mes, d);
                    const activa = dentro(iso, minimo, maximo);
                    const sel = iso === elegida;
                    return (
                      <Pressable key={i} onPress={() => activa && elegir(iso)} disabled={!activa}
                        accessibilityRole="button" accessibilityLabel={fechaParaLeer(iso)} accessibilityState={{ selected: sel, disabled: !activa }}
                        style={[s.celda, s.dia, iso === hoy && s.hoy, sel && s.elegido]}>
                        <Text style={[s.diaTexto, !activa && { color: colors.border }, sel && { color: colors.white }]}>{d}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {vista === 'anios' ? (
              <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={s.opciones}>
                {anios.map((a) => (
                  <Pressable key={a} onPress={() => { setAnio(a); setVista('meses'); }} accessibilityRole="button" accessibilityLabel={`Año ${a}`}
                    style={[s.opcion, a === anio && s.elegido]}>
                    <Text style={[s.opcionTexto, a === anio && { color: colors.white }]}>{a}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {vista === 'meses' ? (
              <View style={s.opciones}>
                {MESES.map((m, i) => {
                  const activo = dentro(isoDe(anio, i, 28), minimo ? minimo.slice(0, 8) + '01' : undefined, maximo) || dentro(isoDe(anio, i, 1), minimo, maximo);
                  return (
                    <Pressable key={m} onPress={() => { setMes(i); setVista('dias'); }} disabled={!activo} accessibilityRole="button" accessibilityLabel={`${m} de ${anio}`}
                      style={[s.opcion, i === mes && s.elegido, !activo && { opacity: 0.3 }]}>
                      <Text style={[s.opcionTexto, i === mes && { color: colors.white }]}>{m.slice(0, 3)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={s.pie}>
              {dentro(hoy, minimo, maximo) ? <Pressable onPress={() => elegir(hoy)} accessibilityRole="button" style={s.accion}><Text style={s.accionTexto}>Hoy</Text></Pressable> : null}
              {opcional && value ? <Pressable onPress={() => { onChangeText(''); setAbierto(false); }} accessibilityRole="button" style={s.accion}><Text style={s.accionTexto}>Borrar la fecha</Text></Pressable> : null}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setAbierto(false)} accessibilityRole="button" style={s.accion}><Text style={[s.accionTexto, { color: colors.textMuted }]}>Cancelar</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  etiqueta: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  campo: {
    minHeight: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  campoError: { borderColor: colors.alert },
  valor: { flex: 1, fontFamily: fonts.body, fontSize: size.base, color: colors.text },
  fondo: { flex: 1, backgroundColor: 'rgba(30, 58, 82, 0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  tarjeta: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 10 },
  cabecera: { flexDirection: 'row', alignItems: 'center' },
  flecha: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tituloTexto: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.primary, textTransform: 'capitalize' },
  semana: { flexDirection: 'row' },
  diaSemana: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, aspectRatio: 1, maxHeight: 48 },
  dia: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  hoy: { borderWidth: 1.5, borderColor: colors.primary3 },
  elegido: { backgroundColor: colors.accion, borderColor: colors.accion },
  diaTexto: { fontFamily: fonts.body, fontSize: 17, color: colors.text },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  opcion: { minWidth: 76, minHeight: 44, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  opcionTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary, textTransform: 'capitalize' },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  accion: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  accionTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.accion },
});
