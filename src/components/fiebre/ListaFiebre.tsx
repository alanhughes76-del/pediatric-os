/**
 * Lista de lo anotado en el registro de fiebre, con quién lo anotó.
 * Del lado del médico suma: revisar (recién ahí entra a la historia clínica) y vincular a una consulta.
 */
import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { autor, consultaMasCercana, consultasDe, sinRevisar, TEXTO_VISITA, type Vista } from '@/data/selectores';
import type { FeverEntry } from '@/data/types';
import { nombreAntitermico, TEXTO_ESTADO, TEXTO_MEJORIA, TEXTO_SITIO, UMBRAL_FIEBRE, grados } from '@/lib/fiebre';
import { ahoraISO, fechaCorta, fechaHoraCorta, hora } from '@/lib/fechas';
import { Tarjeta } from '../Tarjeta';
import { Texto, TextoChico } from '../Texto';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Opciones } from '../Formulario';
import { colors, fonts } from '@/theme';

export function ListaFiebre({ registros, vista }: { registros: FeverEntry[]; vista: Vista }) {
  if (registros.length === 0) return <Texto color={colors.textMuted}>Todavía no hay nada anotado.</Texto>;
  return (
    <View style={{ gap: 10 }}>
      {registros.map((r) => <ItemFiebre key={r.id} r={r} vista={vista} />)}
    </View>
  );
}

function ItemFiebre({ r, vista }: { r: FeverEntry; vista: Vista }) {
  const { db } = useApp();
  const fiebre = r.kind === 'toma' && (r.temperatureC ?? 0) >= UMBRAL_FIEBRE;
  // En el portal la familia no conoce el usuario del Dr.: lo anotado por él se reconoce por el origen.
  const quien = r.enteredByDoctor || r.origin === 'medico' ? db.doctor.name
    : vista === 'familia' && !db.guardians.some((g) => g.id === r.createdBy) && r.createdBy !== db.doctor.id ? 'otro adulto de la familia'
    : autor(db, r.createdBy);

  return (
    <Tarjeta style={{ gap: 8 }}>
      <View style={s.fila}>
        <Ionicons
          name={r.kind === 'toma' ? 'thermometer-outline' : 'medkit-outline'}
          size={26}
          color={fiebre ? colors.alert : colors.primary2}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <TextoChico>{fechaHoraCorta(r.at)}</TextoChico>
          {r.kind === 'toma' ? (
            <>
              <Texto style={[s.temp, fiebre && { color: colors.alert }]}>
                {grados(r.temperatureC ?? 0)} <Texto style={s.sitio}>{r.site ? TEXTO_SITIO[r.site].toLowerCase() : ''}</Texto>
              </Texto>
              {r.state ? <Texto>{TEXTO_ESTADO[r.state]}</Texto> : null}
              {r.improvement ? <TextoChico>Después del antitérmico: {TEXTO_MEJORIA[r.improvement]}</TextoChico> : null}
            </>
          ) : (
            <Texto style={s.droga}>
              {nombreAntitermico(r)}{r.dose ? ` · ${r.dose}` : ''}
            </Texto>
          )}
          {r.note ? <Texto color={colors.textMuted}>“{r.note}”</Texto> : null}
          <TextoChico>Anotó {quien}{r.enteredByDoctor ? ' (registro a mano)' : ''}</TextoChico>
        </View>
      </View>
      {vista === 'medico' ? <AccionesMedico r={r} /> : null}
    </Tarjeta>
  );
}

function AccionesMedico({ r }: { r: FeverEntry }) {
  const { db, actualizar } = useApp();
  const [elegir, setElegir] = useState(false);
  const vinculada = r.consultationId ? db.consultations.find((c) => c.id === r.consultationId) : undefined;
  const sugerida = consultaMasCercana(db, r.patientId, r.at);
  const opciones = consultasDe(db, r.patientId).slice(0, 6);
  const etiquetaConsulta = (c: { occurredAt: string; visitType: keyof typeof TEXTO_VISITA }) => `${fechaCorta(c.occurredAt)} ${hora(c.occurredAt)} · ${TEXTO_VISITA[c.visitType]}`;
  const vincular = (consultationId: string) => { actualizar('fever', r.id, { consultationId }, 'fiebre.vincular'); setElegir(false); };

  return (
    <View style={s.acciones}>
      {sinRevisar(r) ? (
        <View style={{ gap: 8 }}>
          <Etiqueta tono="neutro" texto="Sin revisar · todavía no entra a la historia clínica" />
          <Boton compacto titulo="Marcar revisado" variante="secundario" onPress={() => actualizar('fever', r.id, { reviewedAt: ahoraISO(), reviewedBy: db.doctor.id }, 'fiebre.revisar')} />
        </View>
      ) : (
        <Etiqueta tono="celeste" texto={`Revisado ${fechaHoraCorta(r.reviewedAt!)}`} />
      )}

      {vinculada ? (
        <View style={s.fila}>
          <TextoChico style={{ flex: 1 }}>Vinculado a la consulta del {etiquetaConsulta(vinculada)}</TextoChico>
          <Pressable onPress={() => setElegir(!elegir)} accessibilityRole="button" hitSlop={8}>
            <TextoChico style={s.link}>Cambiar</TextoChico>
          </Pressable>
        </View>
      ) : sugerida ? (
        <View style={{ gap: 6 }}>
          <Boton compacto variante="contorno" titulo={`Vincular a la consulta del ${fechaCorta(sugerida.occurredAt)}`} onPress={() => vincular(sugerida.id)} />
          <View style={s.fila}>
            <TextoChico style={{ flex: 1 }}>Sugerida: la más cercana en fecha ({etiquetaConsulta(sugerida)}).</TextoChico>
            <Pressable onPress={() => setElegir(!elegir)} accessibilityRole="button" hitSlop={8}>
              <TextoChico style={s.link}>Otra…</TextoChico>
            </Pressable>
          </View>
        </View>
      ) : (
        <TextoChico>Este paciente todavía no tiene consultas para vincular.</TextoChico>
      )}

      {elegir ? (
        <Opciones
          columna
          opciones={opciones.map((c) => ({ valor: c.id, texto: etiquetaConsulta(c), detalle: c.id === sugerida?.id ? 'La más cercana en fecha' : undefined }))}
          valor={r.consultationId}
          onCambio={vincular}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  temp: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.primary },
  sitio: { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted },
  droga: { fontFamily: fonts.bodySemi, fontSize: 20, color: colors.primary },
  acciones: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  link: { fontFamily: fonts.bodySemi, color: colors.primary2 },
});
