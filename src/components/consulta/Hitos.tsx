/**
 * Hitos del desarrollo en la consulta (CDC/AAP 2022 + PRUNAPE 5 años).
 * Tildar guarda solo (MilestoneCheck).
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import type { Consultation, Patient } from '@/data/types';
import { edadParaCalculo } from '@/lib/edad';
import { ahoraISO } from '@/lib/fechas';
import { CONTROLES, controlParaEdad, etiquetaControl, gruposDelControl, recordatoriosTamizaje, AVISO_HITOS, ACLARACION_HITOS, FUENTE_HITOS } from '@/lib/hitos';
import { Casilla, Aviso } from '../Formulario';
import { TextoFuerte, TextoChico } from '../Texto';
import { colors, fonts } from '@/theme';

export function Hitos({ consulta, paciente }: { consulta: Consultation; paciente: Patient }) {
  const { db, agregar, actualizar } = useApp();
  const edad = edadParaCalculo(paciente, consulta.occurredAt.slice(0, 10));
  const sugerido = controlParaEdad(edad.ok ? edad.meses : 0);
  const [control, setControl] = useState(sugerido.control);

  const grupos = gruposDelControl(control);
  const total = grupos.reduce((n, g) => n + g.items.length, 0);
  const marcas = db.milestoneChecks.filter((m) => m.consultationId === consulta.id && m.control === control);
  const marcado = (itemId: string) => marcas.some((m) => m.itemId === itemId && m.achieved);
  const cantidad = grupos.reduce((n, g) => n + g.items.filter((i) => marcado(i.id)).length, 0);

  const tildar = (itemId: string, achieved: boolean) => {
    const existente = marcas.find((m) => m.itemId === itemId);
    if (existente) actualizar('milestoneChecks', existente.id, { achieved, updatedAt: ahoraISO() }, 'hito.marcar');
    else agregar('milestoneChecks', { patientId: paciente.id, consultationId: consulta.id, control, itemId, achieved, updatedAt: ahoraISO() }, 'hito.marcar');
  };

  return (
    <View style={{ gap: 14 }}>
      {!edad.ok ? <Aviso tono="alerta" texto="No se puede calcular la edad para esta fecha de consulta: revisá las fechas." /> : null}
      {control === sugerido.control && sugerido.aviso ? <Aviso texto={sugerido.aviso} /> : null}
      {edad.ok && edad.corregida ? <TextoChico>Lista elegida por edad corregida.</TextoChico> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.controles}>
        {CONTROLES.map((c) => {
          const activo = c === control;
          return (
            <Pressable key={c} onPress={() => setControl(c)} accessibilityRole="tab" accessibilityState={{ selected: activo }} style={[s.control, activo && s.controlActivo]}>
              <Text style={[s.controlTexto, activo && { color: colors.white }]}>{etiquetaControl(c)}</Text>
              {c === sugerido.control ? <Text style={[s.sugerido, activo && { color: colors.bgSoft }]}>por edad</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <TextoFuerte color={colors.primary}>Marcados {cantidad} de {total}</TextoFuerte>

      {recordatoriosTamizaje(control).map((t) => (
        <Aviso key={t} icono="clipboard-outline" texto={`Recordatorio de tamizaje: ${t}.`} />
      ))}

      {grupos.map((g) => (
        <View key={g.titulo} style={{ gap: 2 }}>
          <TextoFuerte style={{ marginBottom: 4 }}>{g.titulo}</TextoFuerte>
          {g.items.map((i) => (
            <Casilla key={i.id} marcada={marcado(i.id)} onCambio={(v) => tildar(i.id, v)} texto={i.texto} detalle={i.etiqueta} />
          ))}
        </View>
      ))}

      <Aviso tono="alerta" icono="alert-circle-outline" texto={AVISO_HITOS} />
      <TextoChico style={{ fontFamily: fonts.bodySemi }}>{ACLARACION_HITOS}</TextoChico>
      <TextoChico>{FUENTE_HITOS}</TextoChico>
    </View>
  );
}

const s = StyleSheet.create({
  controles: { gap: 8, paddingVertical: 2 },
  control: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary3, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  controlActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  controlTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary },
  sugerido: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
