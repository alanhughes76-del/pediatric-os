/**
 * Transcripción de Plaud (prompt maestro 7.20). Llega desde Make como borrador; nada se aprueba solo.
 * - Paciente: se sugiere por la fecha de nacimiento dictada; si coinciden varios (o ninguno), elegís vos.
 * - Consulta: la de ese día de ese paciente, o una nueva. La transcripción queda como "texto original" de
 *   la consulta; la nota la escribís y la aprobás vos, como siempre.
 * - Medidas dictadas: "Usar estos valores" o "Descartar".
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { consultasDe, nombreCompleto, TEXTO_VISITA } from '@/data/selectores';
import type { VisitType } from '@/data/types';
import { filtrarPacientes } from '@/lib/busqueda';
import { edades } from '@/lib/edad';
import { fechaCorta, fechaHoraCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Campo, Opciones, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { EstadoVacio } from '@/components/Estados';
import { Subtitulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { BotonTexto } from '@/components/ficha/piezas';
import { colors } from '@/theme';

const TIPOS = (Object.keys(TEXTO_VISITA) as VisitType[]).map((v) => ({ valor: v, texto: TEXTO_VISITA[v] }));

export default function TranscripcionPlaud() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, agregar, actualizar, operaciones } = useApp();
  const t = db.transcripciones.find((x) => x.id === id);
  const [elegido, setElegido] = useState<string>();
  const [busqueda, setBusqueda] = useState('');
  const [consultaElegida, setConsultaElegida] = useState<string>();
  const [tipo, setTipo] = useState<VisitType>('control');
  const [medidas, setMedidas] = useState<'usar' | 'descartar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!t) return <Pantalla><EstadoVacio icono="help-circle-outline" titulo="No encontramos esta transcripción" /></Pantalla>;

  const patientId = elegido ?? (t.pacientesSugeridos.length === 1 ? t.pacientesSugeridos[0] : undefined);
  const paciente = db.patients.find((p) => p.id === patientId);
  const dia = t.grabadaAt.slice(0, 10);
  const delDia = paciente ? consultasDe(db, paciente.id).filter((c) => c.occurredAt.slice(0, 10) === dia) : [];
  const consultaId = consultaElegida ?? delDia[0]?.id ?? 'nueva';
  const hayMedidas = Object.keys(t.medidas).length > 0;
  const resultados = busqueda.trim().length >= 2 ? filtrarPacientes(db.patients, 'todos', busqueda).slice(0, 6) : [];
  const usada = t.estado !== 'pendiente';

  const pasar = async () => {
    if (!paciente) return setError('Elegí el paciente.');
    if (hayMedidas && medidas === null) return setError('Decidí qué hacer con las medidas dictadas: usarlas o descartarlas.');
    let cid = consultaId;
    if (cid === 'nueva') {
      cid = agregar('consultations', { patientId: paciente.id, occurredAt: t.grabadaAt, modality: 'domicilio', visitType: tipo, status: 'realizada', rawText: t.texto }, 'consulta.crear_desde_plaud');
    } else {
      const c = db.consultations.find((x) => x.id === cid)!;
      actualizar('consultations', cid, { rawText: c.rawText.trim() ? `${c.rawText.trim()}\n\n— Transcripción de Plaud —\n${t.texto}` : t.texto }, 'consulta.agregar_plaud');
    }
    if (medidas === 'usar') {
      const existente = db.measurements.find((m) => m.consultationId === cid && !m.archivedAt);
      if (existente) actualizar('measurements', existente.id, { ...t.medidas }, 'medicion.desde_plaud');
      else agregar('measurements', { patientId: paciente.id, consultationId: cid, measuredAt: dia, ...t.medidas }, 'medicion.desde_plaud');
    }
    const e = await operaciones.actualizarEntrada('transcripciones', t.id, { estado: 'usada', patientId: paciente.id, consultationId: cid, medidasUsadas: hayMedidas ? medidas === 'usar' : undefined });
    if (e) return setError(e);
    router.replace(`/medico/consulta/${cid}`);
  };

  const descartar = async () => {
    const e = await operaciones.actualizarEntrada('transcripciones', t.id, { estado: 'descartada' });
    if (e) return setError(e);
    if (router.canGoBack()) router.back();
    else router.replace('/medico/avisos');
  };

  return (
    <Pantalla ancho>
      <Stack.Screen options={{ title: 'Transcripción de Plaud' }} />
      <Subtitulo>Grabada el {fechaHoraCorta(t.grabadaAt)}</Subtitulo>
      {usada ? <Aviso texto={t.estado === 'usada' ? 'Ya la pasaste a una consulta.' : 'La descartaste.'} /> : (
        <TextoChico>Es un borrador: queda como texto original de la consulta y la nota la escribís y aprobás vos.</TextoChico>
      )}

      <Tarjeta style={{ gap: 10 }}>
        <TextoFuerte>Paciente</TextoFuerte>
        {t.fechasNacimiento.length > 0 ? <TextoChico>Fecha de nacimiento dictada: {t.fechasNacimiento.map(fechaCorta).join(', ')}</TextoChico> : <TextoChico>No se dictó una fecha de nacimiento.</TextoChico>}
        {paciente ? (
          <View style={s.fila}>
            <View style={{ flex: 1 }}>
              <TextoFuerte>{nombreCompleto(paciente)}</TextoFuerte>
              <TextoChico>Nació el {fechaCorta(paciente.birthDate)} · {edades(paciente, dia, 'abreviado').cronologica}</TextoChico>
            </View>
            {!usada ? <BotonTexto texto="Cambiar" onPress={() => { setElegido(''); setConsultaElegida(undefined); }} /> : null}
          </View>
        ) : null}
        {!paciente && !usada ? (
          <>
            {t.pacientesSugeridos.length > 1 ? <Texto>Coinciden varios pacientes con esa fecha. Elegí:</Texto> : null}
            {t.pacientesSugeridos.map((pid) => db.patients.find((p) => p.id === pid)).filter(Boolean).map((p) => (
              <Boton key={p!.id} titulo={nombreCompleto(p!)} variante="secundario" compacto onPress={() => setElegido(p!.id)} />
            ))}
            <Campo etiqueta="Buscar otro paciente" value={busqueda} onChangeText={setBusqueda} placeholder="Nombre o apellido" autoCorrect={false} />
            {resultados.map((p) => <BotonTexto key={p.id} texto={`${nombreCompleto(p)} · ${fechaCorta(p.birthDate)}`} onPress={() => { setElegido(p.id); setBusqueda(''); }} />)}
          </>
        ) : null}
      </Tarjeta>

      {paciente && !usada ? (
        <Tarjeta style={{ gap: 10 }}>
          <TextoFuerte>Consulta</TextoFuerte>
          <Opciones columna valor={consultaId} onCambio={setConsultaElegida}
            opciones={[
              ...delDia.map((c) => ({ valor: c.id, texto: `La del ${fechaCorta(c.occurredAt)}`, detalle: TEXTO_VISITA[c.visitType] })),
              { valor: 'nueva', texto: 'Una consulta nueva', detalle: `Del ${fechaCorta(t.grabadaAt)}` },
            ]} />
          {consultaId === 'nueva' ? <Opciones etiqueta="Tipo de visita" valor={tipo} onCambio={setTipo} opciones={TIPOS} /> : null}
        </Tarjeta>
      ) : null}

      {hayMedidas && !usada ? (
        <Tarjeta style={{ gap: 10 }}>
          <TextoFuerte>Medidas dictadas</TextoFuerte>
          <View style={s.etiquetas}>
            {t.medidas.weightKg ? <Etiqueta texto={`Peso ${t.medidas.weightKg.toLocaleString('es-AR')} kg`} /> : null}
            {t.medidas.heightCm ? <Etiqueta texto={`Talla ${t.medidas.heightCm.toLocaleString('es-AR')} cm`} /> : null}
            {t.medidas.headCm ? <Etiqueta texto={`PC ${t.medidas.headCm.toLocaleString('es-AR')} cm`} /> : null}
          </View>
          <TextoChico>Revisalas contra la transcripción antes de usarlas.</TextoChico>
          <View style={s.etiquetas}>
            <Boton titulo="Usar estos valores" icono={medidas === 'usar' ? 'checkmark-circle' : undefined} variante={medidas === 'usar' ? 'principal' : 'secundario'} compacto onPress={() => setMedidas('usar')} />
            <Boton titulo="Descartar" variante={medidas === 'descartar' ? 'principal' : 'contorno'} compacto onPress={() => setMedidas('descartar')} />
          </View>
        </Tarjeta>
      ) : null}

      <Tarjeta style={{ gap: 6 }}>
        <TextoFuerte>Transcripción</TextoFuerte>
        <Texto>{t.texto}</Texto>
      </Tarjeta>

      {error ? <Aviso tono="alerta" texto={error} /> : null}
      {!usada ? (
        <>
          <Boton titulo="Pasar a la consulta" icono="arrow-forward" onPress={() => void pasar()} />
          <Boton titulo="Descartar la transcripción" variante="contorno" onPress={() => void descartar()} />
        </>
      ) : t.consultationId ? <Boton titulo="Abrir la consulta" variante="secundario" onPress={() => router.push(`/medico/consulta/${t.consultationId}`)} /> : null}
      <TextoChico color={colors.textMuted}>Recibida el {fechaHoraCorta(t.recibidaAt)}.</TextoChico>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
