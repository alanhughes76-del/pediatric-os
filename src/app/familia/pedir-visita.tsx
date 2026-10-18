/**
 * Pedir visita (prompt maestro 7.19): crea una SOLICITUD en la agenda del Dr. (no es una
 * confirmación). Control: día y hora que prefieren. Urgencia: se pide para ahora, después de ver
 * los signos de alarma. Mientras exista Cal.com, también se puede reservar ahí.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp, useSesionFamilia } from '@/data/store';
import { pacientesDeAdulto } from '@/data/selectores';
import { abrirAgenda } from '@/lib/agenda';
import { deFecha, hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { Campo, Casilla, Opciones, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Subtitulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { colors } from '@/theme';

export default function PedirVisitaFormulario() {
  const { db, operaciones } = useApp();
  const { guardian } = useSesionFamilia();
  const { tipo: tipoParam } = useLocalSearchParams<{ tipo?: string }>();
  const tipo = tipoParam === 'urgencia' ? 'urgencia' : 'control';
  const hijos = pacientesDeAdulto(db, guardian.id);
  const direcciones = db.addresses.filter((a) => a.guardianId === guardian.id && !a.archivedAt);
  const [elegidos, setElegidos] = useState<string[]>(hijos.length === 1 ? [hijos[0].id] : []);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [direccion, setDireccion] = useState<string | undefined>(direcciones[0]?.id);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [sinLink, setSinLink] = useState(false);
  const linkCal = tipo === 'urgencia' ? db.links.calUrgenciaUrl : db.links.calControlUrl;

  const pedir = async () => {
    setError(null);
    if (elegidos.length === 0) return setError('Elegí para quién es la visita.');
    let dia: string | undefined;
    if (tipo === 'control') {
      dia = deFecha(fecha) ?? undefined;
      if (!dia || !/^\d{1,2}[:.]\d{2}$/.test(hora.trim())) return setError('Elegí el día y escribí la hora (hh:mm) que prefieren.');
      if (dia < hoyISO()) return setError('Elegí un día de hoy en adelante.');
    }
    setEnviando(true);
    const e = await operaciones.pedirVisita({
      patientIds: elegidos, tipo, fecha: dia, hora: tipo === 'control' ? hora.trim().replace('.', ':').padStart(5, '0') : undefined,
      addressId: direccion, motivo: motivo.trim(),
    });
    setEnviando(false);
    if (e) return setError(e);
    setListo(true);
  };

  if (listo) {
    return (
      <Pantalla pie={<BarraPacienteX />}>
        <Aviso icono="checkmark-circle" texto="Listo: tu pedido le llegó al Dr. Te va a confirmar el día y la hora." />
        <Texto>Si es urgente o te preocupa algo, escribile por PacienteX. En una emergencia, llamá al SAME 107.</Texto>
        <Boton titulo="Volver al inicio" variante="contorno" onPress={() => router.replace('/familia')} />
      </Pantalla>
    );
  }

  return (
    <Pantalla pie={<BarraPacienteX />}>
      <Subtitulo>{tipo === 'urgencia' ? 'Consulta por urgencia' : 'Control de salud'}</Subtitulo>
      <TextoChico>Es un pedido: el Dr. lo revisa y te confirma.</TextoChico>

      {hijos.length > 1 ? (
        <View style={{ gap: 4 }}>
          <TextoFuerte>¿Para quién?</TextoFuerte>
          {hijos.map((h) => (
            <Casilla key={h.id} texto={h.firstName} marcada={elegidos.includes(h.id)}
              onCambio={(v) => setElegidos((xs) => (v ? [...xs, h.id] : xs.filter((x) => x !== h.id)))} />
          ))}
        </View>
      ) : null}

      {tipo === 'control' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 3, minWidth: 150 }}><CampoFecha etiqueta="Día que prefieren" value={fecha} onChangeText={setFecha} minimo={hoyISO()} /></View>
          <View style={{ flex: 2, minWidth: 110 }}><Campo etiqueta="Hora" value={hora} onChangeText={setHora} placeholder="hh:mm" keyboardType="numbers-and-punctuation" /></View>
        </View>
      ) : (
        <Texto>Se la pedimos al Dr. para ahora. Si empeora, no esperes: llamá al SAME 107.</Texto>
      )}

      {direcciones.length > 0 ? (
        <Opciones etiqueta="¿Dónde?" columna valor={direccion} onCambio={setDireccion}
          opciones={direcciones.map((a) => ({ valor: a.id, texto: a.street, detalle: a.locality }))} />
      ) : (
        <TextoChico>No tenés direcciones cargadas: podés sumarlas en “Mis datos”.</TextoChico>
      )}

      <Campo etiqueta="Motivo (en pocas palabras)" value={motivo} onChangeText={setMotivo} maxLength={200} placeholder={tipo === 'urgencia' ? 'Fiebre desde ayer, tos…' : 'Control anual, vacunas…'} />
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      <Boton titulo={enviando ? 'Enviando…' : 'Pedir la visita'} icono="send-outline" deshabilitado={enviando} onPress={() => void pedir()} />

      {linkCal ? (
        <Boton titulo="Prefiero elegir el horario en Cal.com" variante="contorno" onPress={async () => setSinLink(!(await abrirAgenda(linkCal)))} />
      ) : null}
      {sinLink ? <TextoChico color={colors.alert}>No se pudo abrir Cal.com. Escribime por PacienteX.</TextoChico> : null}
    </Pantalla>
  );
}
