/**
 * Panel de la IA Asistente para un paciente (prompt maestro 7.18 y 5.2): resumir la historia, sugerir
 * material, revisar estudios y una consulta libre. ("Preparar evolución" vive en la nota de la consulta.)
 * Lo que vuelve es una propuesta: el Dr. la revisa y marca "Me sirve" o "Descartar" (queda registrado).
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import type { AccionIA } from '@/data/types';
import { Boton } from '../Boton';
import { Campo, Aviso } from '../Formulario';
import { Etiqueta } from '../Etiqueta';
import { Cargando } from '../Estados';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { categorias, colors } from '@/theme';

export const TEXTO_ACCION: Record<AccionIA, string> = {
  resumir_historia: 'Resumir historia del paciente',
  preparar_evolucion: 'Preparar evolución de consulta',
  sugerir_material: 'Sugerir material educativo',
  revisar_estudios: 'Revisar estudios pendientes',
  consulta_libre: 'Consulta libre',
};
const ACCIONES: AccionIA[] = ['resumir_historia', 'sugerir_material', 'revisar_estudios'];

type Resultado = Record<string, unknown>;
const lista = (v: unknown): Resultado[] => (Array.isArray(v) ? (v as Resultado[]) : []);
const textos = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);

export function PanelIA({ patientId }: { patientId: string }) {
  const { db, operaciones } = useApp();
  const [accion, setAccion] = useState<AccionIA | null>(null);
  const [pregunta, setPregunta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<{ id?: string; resultado: Resultado } | null>(null);
  const [decision, setDecision] = useState<boolean | null>(null);

  if (!db.ia.enabled) {
    return (
      <View style={{ gap: 8 }}>
        <Texto color={colors.textMuted}>La IA está apagada. Se enciende en Configuración, después de revisar el consentimiento informado para usar IA con datos de salud.</Texto>
        <Boton titulo="Ir a Configuración" variante="contorno" compacto onPress={() => router.push({ pathname: '/medico/configuracion', params: { seccion: 'mas' } })} />
      </View>
    );
  }

  const pedir = async (a: AccionIA) => {
    setAccion(a); setError(null); setPropuesta(null); setDecision(null); setCargando(true);
    const r = await operaciones.pedirIA({ accion: a, patientId, pregunta: a === 'consulta_libre' ? pregunta : undefined });
    setCargando(false);
    if (r.error || !r.resultado) return setError(r.error ?? 'La IA no respondió.');
    setPropuesta({ id: r.interaccionId, resultado: r.resultado });
  };

  const decidir = async (aceptado: boolean) => {
    setDecision(aceptado);
    if (propuesta?.id) {
      const e = await operaciones.decidirIA(propuesta.id, aceptado);
      if (e) setError(e);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={s.botones}>
        {ACCIONES.map((a) => (
          <Boton key={a} titulo={TEXTO_ACCION[a]} icono="sparkles-outline" variante="secundario" compacto deshabilitado={cargando} onPress={() => void pedir(a)} />
        ))}
      </View>
      <Campo etiqueta="Consulta libre sobre este paciente" value={pregunta} onChangeText={setPregunta} multiline maxLength={1000}
        placeholder="Ej.: ¿Cuándo fue la última vez que se midió el perímetro cefálico?" />
      <Boton titulo="Preguntar" icono="chatbubble-ellipses-outline" compacto deshabilitado={cargando || !pregunta.trim()} onPress={() => void pedir('consulta_libre')} />

      {cargando ? <Cargando texto={`${TEXTO_ACCION[accion!]}…`} /> : null}
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      {propuesta && accion ? (
        <View style={s.propuesta}>
          <View style={s.fila}>
            <Etiqueta texto="Propuesta de la IA" tono="violeta" />
            <TextoChico style={{ flex: 1 }}>{TEXTO_ACCION[accion]}</TextoChico>
          </View>
          <Contenido accion={accion} r={propuesta.resultado} />
          {textos(propuesta.resultado.datosFaltantes).length ? (
            <TextoChico>Faltan datos: {textos(propuesta.resultado.datosFaltantes).join('; ')}.</TextoChico>
          ) : null}
          <TextoChico color={colors.textMuted}>Revisala: puede equivocarse. No entra a la historia clínica ni llega a la familia.</TextoChico>
          {decision === null ? (
            <View style={s.botones}>
              <Boton titulo="Me sirve" icono="checkmark" compacto onPress={() => void decidir(true)} />
              <Boton titulo="Descartar" variante="contorno" compacto onPress={() => void decidir(false)} />
            </View>
          ) : <TextoChico>{decision ? 'Marcada como útil.' : 'Descartada.'}</TextoChico>}
        </View>
      ) : null}
    </View>
  );
}

function Contenido({ accion, r }: { accion: AccionIA; r: Resultado }) {
  const { db } = useApp();
  if (accion === 'resumir_historia') return <Texto>{String(r.resumen ?? '')}</Texto>;
  if (accion === 'consulta_libre') return <Texto>{String(r.respuesta ?? '')}</Texto>;
  if (accion === 'sugerir_material') {
    const sug = lista(r.sugerencias);
    if (sug.length === 0) return <Texto>Ningún material de tu biblioteca corresponde.</Texto>;
    return (
      <View style={{ gap: 6 }}>
        {sug.map((x) => (
          <View key={String(x.materialId)}>
            <TextoFuerte>{db.educationalMaterials.find((m) => m.id === x.materialId)?.title ?? 'Material'}</TextoFuerte>
            <TextoChico>{String(x.motivo ?? '')}</TextoChico>
          </View>
        ))}
        <TextoChico>Se mandan desde la ficha (Prevención) o por tu agente de comunicaciones.</TextoChico>
      </View>
    );
  }
  if (accion === 'revisar_estudios') {
    return (
      <View style={{ gap: 6 }}>
        <Texto>{String(r.resumen ?? '')}</Texto>
        {lista(r.pendientes).map((x) => (
          <View key={String(x.studyId)}>
            <TextoFuerte>{db.studies.find((e) => e.id === x.studyId)?.study ?? 'Estudio'}</TextoFuerte>
            <TextoChico>{String(x.comentario ?? '')}</TextoChico>
          </View>
        ))}
      </View>
    );
  }
  return null;
}

const s = StyleSheet.create({
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  propuesta: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: categorias.violeta.fondo },
});
