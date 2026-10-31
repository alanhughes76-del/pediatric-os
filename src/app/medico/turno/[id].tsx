/**
 * Un turno: datos, acciones según su estado e historial de cambios (prompt maestro 7.2).
 * Todas las acciones pasan por el servidor (en Firebase) o por la misma lógica en la demostración.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  accionesDe, horaDe, inicioDe, TEXTO_ACCION_TURNO, TEXTO_ESTADO_TURNO, TEXTO_TIPO_TURNO,
  type AccionTurno, type Aviso,
} from '@shared/agenda';
import { useApp } from '@/data/store';
import { TriageUrgencia } from '@/components/TriageUrgencia';
import type { PedidoAccionTurno } from '@/data/contrato';
import type { AppointmentChange } from '@/data/types';
import { consultaDeTurno, historialDeTurno, nombreCompleto, nombreDeTurno, pacientesDeTurno, textoDireccionTurno, TEXTO_MODALIDAD } from '@/data/selectores';
import { deFecha, diaYFecha, fechaHoraCorta, hora } from '@/lib/fechas';
import { abrirEnGoogleMaps, abrirEnWaze } from '@/lib/mapas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Seccion } from '@/components/Seccion';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { Campo, Aviso as AvisoTexto } from '@/components/Formulario';
import { DialogoConfirmar, EstadoVacio } from '@/components/Estados';
import { EtiquetaEstado, ListaAvisos, horaFin } from '@/components/agenda/piezas';
import { FormularioTurno } from '@/components/agenda/FormularioTurno';
import { useAbrirConsulta } from '@/components/agenda/abrirConsulta';
import { colors } from '@/theme';
import { useRolEquipo } from '@/navegacion/useRolEquipo';
import { rutaDelPaciente } from '@/navegacion/permisos';

type Panel = null | 'reprogramar' | 'editar' | 'cancelar';
const aDdMm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;

const BOTON: Record<AccionTurno, { titulo: string; icono: Parameters<typeof Boton>[0]['icono']; variante: 'principal' | 'secundario' | 'contorno' }> = {
  confirmar: { titulo: 'Confirmar', icono: 'checkmark-circle-outline', variante: 'principal' },
  pendiente: { titulo: 'Pasar a pendiente de confirmación', icono: 'hourglass-outline', variante: 'secundario' },
  en_camino: { titulo: 'Estoy en camino', icono: 'car-outline', variante: 'principal' },
  realizado: { titulo: 'Marcar realizado', icono: 'checkmark-done-outline', variante: 'secundario' },
  reprogramar: { titulo: 'Reprogramar', icono: 'calendar-outline', variante: 'contorno' },
  editar: { titulo: 'Editar datos', icono: 'create-outline', variante: 'contorno' },
  ausente: { titulo: 'Marcar ausente', icono: 'person-remove-outline', variante: 'contorno' },
  cancelar: { titulo: 'Cancelar turno', icono: 'close-circle-outline', variante: 'contorno' },
};

export default function Turno() {
  const rol = useRolEquipo();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, operaciones, usuarioId } = useApp();
  const abrirConsulta = useAbrirConsulta();
  const t = db.appointments.find((a) => a.id === id);
  const [panel, setPanel] = useState<Panel>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ pedido: Omit<PedidoAccionTurno, 'turno'>; avisos: Aviso[] } | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [preguntarAusente, setPreguntarAusente] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaTxt, setHoraTxt] = useState('');
  const [duracion, setDuracion] = useState('');

  if (!t) {
    return <Pantalla><EstadoVacio icono="calendar-outline" titulo="No encontramos este turno" accion={<Boton titulo="Ir a la agenda" onPress={() => router.navigate('/medico/agenda')} />} /></Pantalla>;
  }

  const pacientes = pacientesDeTurno(db, t);
  const historial = historialDeTurno(db, t.id);
  const acciones = accionesDe(t.status);

  const ejecutar = async (pedido: Omit<PedidoAccionTurno, 'turno'>, exito: string) => {
    setGuardando(true);
    setError(null);
    setHecho(null);
    const r = await operaciones.accionTurno({ turno: t, ...pedido });
    setGuardando(false);
    if (r.estado === 'guardado') {
      setAviso(null);
      setPanel(null);
      setMotivo('');
      setHecho(exito);
    } else if (r.estado === 'avisos') {
      setAviso({ pedido, avisos: r.avisos });
    } else {
      setAviso(null);
      setError(r.mensaje);
    }
  };

  const tocar = (a: AccionTurno) => {
    setError(null);
    setHecho(null);
    switch (a) {
      case 'reprogramar':
        setFecha(aDdMm(t.day));
        setHoraTxt(horaDe(t.start));
        setDuracion(String(t.durationMin));
        return setPanel(panel === 'reprogramar' ? null : 'reprogramar');
      case 'editar':
      case 'cancelar':
        return setPanel(panel === a ? null : a);
      case 'ausente':
        return setPreguntarAusente(true);
      case 'confirmar': return ejecutar({ accion: 'confirmar' }, 'Turno confirmado.');
      case 'pendiente': return ejecutar({ accion: 'pendiente' }, 'Quedó pendiente de confirmación.');
      case 'en_camino': return ejecutar({ accion: 'en_camino' }, 'Quedó registrado "Estoy en camino". El mensaje a la familia sale por Make cuando esté conectado (Etapa 8).');
      case 'realizado': return ejecutar({ accion: 'realizado' }, rol === 'medico' ? 'Turno realizado. Podés abrir la consulta de cada chico.' : 'Turno marcado como realizado.');
    }
  };

  const reprogramar = () => {
    const dia = deFecha(fecha);
    const inicio = dia && /^\d{1,2}[:.]\d{2}$/.test(horaTxt.trim()) ? inicioDe(dia, horaTxt.trim().replace('.', ':').padStart(5, '0')) : null;
    const min = Number(duracion);
    if (!inicio) return setError('Revisá la fecha y la hora (hh:mm).');
    if (!Number.isInteger(min) || min < 10 || min > 480) return setError('La duración tiene que estar entre 10 y 480 minutos.');
    ejecutar({ accion: 'reprogramar', start: inicio, durationMin: min }, 'Turno reprogramado. El cambio queda en el historial.');
  };

  const actor = (h: AppointmentChange) => (h.actorId === usuarioId ? 'Vos' : h.actorId === 'calcom' ? 'Cal.com' : h.actorId === 'sistema' ? 'Sistema' : 'Equipo');
  const puedeAbrirConsulta = (t.status === 'confirmado' || t.status === 'realizado') && pacientes.length > 0;

  return (
    <Pantalla ancho>
      <Stack.Screen options={{ title: 'Turno' }} />
      {db.triage.filter((x) => x.appointmentId === t.id).map((x) => <TriageUrgencia key={x.id} t={x} />)}

      <Tarjeta style={{ gap: 10 }}>
        <TextoChico>{diaYFecha(t.day)}</TextoChico>
        <Titulo>{hora(t.start)} a {horaFin(t)} · {nombreDeTurno(db, t)}</Titulo>
        <View style={s.etiquetas}>
          <EtiquetaEstado estado={t.status} />
          <Etiqueta texto={TEXTO_TIPO_TURNO[t.type]} tono={t.type.startsWith('urgencia') ? 'azul' : 'celeste'} />
          <Etiqueta texto={TEXTO_MODALIDAD[t.modality]} tono="neutro" />
          <Etiqueta texto={t.origin === 'calcom' ? 'Pedido por Cal.com' : t.origin === 'portal' ? 'Pedido desde el portal' : t.origin === 'formulario' ? 'Formulario web' : 'Cargado por el equipo'} tono="neutro" />
        </View>
        {t.status === 'cancelado' && t.cancelReason ? <Texto>Motivo de la cancelación: {t.cancelReason}</Texto> : null}
        {t.onTheWayAt ? <TextoChico>“Estoy en camino” a las {hora(t.onTheWayAt)}.</TextoChico> : null}
      </Tarjeta>

      {hecho ? <AvisoTexto icono="checkmark-circle" texto={hecho} /> : null}
      {error ? <AvisoTexto tono="alerta" texto={error} /> : null}
      {aviso ? (
        <ListaAvisos avisos={aviso.avisos} onRevisar={() => setAviso(null)} onAceptar={() => ejecutar({ ...aviso.pedido, aceptarAvisos: true }, 'Guardado.')} />
      ) : null}

      {acciones.length > 0 ? (
        <View style={s.acciones}>
          {acciones.map((a) => (
            <View key={a} style={s.accion}>
              <Boton compacto titulo={BOTON[a].titulo} icono={BOTON[a].icono} variante={BOTON[a].variante} deshabilitado={guardando} onPress={() => tocar(a)} />
            </View>
          ))}
        </View>
      ) : null}

      {panel === 'reprogramar' ? (
        <Seccion titulo="Reprogramar">
          <Tarjeta style={{ gap: 12 }}>
            <View style={s.fila}>
              <View style={{ flex: 3, minWidth: 150 }}><CampoFecha etiqueta="Fecha" value={fecha} onChangeText={setFecha} /></View>
              <View style={{ flex: 2, minWidth: 100 }}><Campo etiqueta="Hora" value={horaTxt} onChangeText={setHoraTxt} placeholder="hh:mm" /></View>
              <View style={{ flex: 2, minWidth: 100 }}><Campo etiqueta="Minutos" value={duracion} onChangeText={(v) => setDuracion(v.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
            </View>
            {t.status === 'confirmado' ? <TextoChico>Sigue confirmado: el servidor revisa que el horario nuevo no se superponga.</TextoChico> : null}
            <Boton titulo={guardando ? 'Guardando…' : 'Guardar el horario nuevo'} deshabilitado={guardando} onPress={reprogramar} />
          </Tarjeta>
        </Seccion>
      ) : null}

      {panel === 'cancelar' ? (
        <Seccion titulo="Cancelar el turno">
          <Tarjeta style={{ gap: 12 }}>
            <Campo etiqueta="Motivo" value={motivo} onChangeText={setMotivo} maxLength={500} placeholder="La familia pidió pasarlo, enfermedad del médico…" ayuda="Queda en el historial. El horario se libera." />
            <Boton titulo="Cancelar turno" variante="alerta" deshabilitado={guardando || !motivo.trim()} onPress={() => ejecutar({ accion: 'cancelar', motivo }, 'Turno cancelado. El horario quedó libre.')} />
          </Tarjeta>
        </Seccion>
      ) : null}

      {panel === 'editar' ? (
        <Seccion titulo="Editar datos">
          <Tarjeta>
            <FormularioTurno
              inicial={{ turno: t }}
              conHorario={false}
              conConfirmar={false}
              conMotivo={rol === 'medico'}
              textoGuardar="Guardar cambios"
              guardando={guardando}
              onGuardar={(d) => ejecutar({
                accion: 'editar',
                // El asistente no ve el motivo: si lo mandara vacío, borraría el que hay.
                cambios: { type: d.type, modality: d.modality, familyId: d.familyId, patientIds: d.patientIds, address: d.address, opsNotes: d.opsNotes, ...(rol === 'medico' ? { reason: d.reason } : {}) },
              }, 'Cambios guardados.')}
            />
          </Tarjeta>
        </Seccion>
      ) : null}

      <View style={s.columnas}>
        <View style={s.columna}>
          <Seccion titulo={pacientes.length > 1 ? 'Pacientes' : 'Paciente'}>
            {pacientes.length === 0 ? (
              <Texto color={colors.textMuted}>{t.type === 'prenatal' ? 'Turno prenatal: va con la familia.' : 'Todavía sin identificar. Usá "Editar datos" para elegir la familia y el paciente.'}</Texto>
            ) : null}
            {pacientes.map((p) => {
              const consulta = consultaDeTurno(db, t.id, p.id);
              return (
                <Tarjeta key={p.id} style={{ gap: 10 }}>
                  <TextoFuerte>{nombreCompleto(p)}</TextoFuerte>
                  <View style={s.fila}>
                    {rol === 'asistente' ? (
                      p.familyId ? <View style={s.accion}><Boton compacto titulo="Ver familia" variante="contorno" icono="people-outline" onPress={() => router.push(rutaDelPaciente(rol, p))} /></View> : null
                    ) : <View style={s.accion}><Boton compacto titulo="Ver ficha" variante="contorno" icono="document-text-outline" onPress={() => router.push(`/medico/hijo/${p.id}`)} /></View>}
                    {puedeAbrirConsulta && rol === 'medico' ? (
                      <View style={s.accion}><Boton compacto titulo={consulta ? 'Ver consulta' : 'Abrir consulta'} icono="create-outline" onPress={() => abrirConsulta(t, p.id)} /></View>
                    ) : null}
                  </View>
                </Tarjeta>
              );
            })}
          </Seccion>

          {t.modality === 'domicilio' ? (
            <Seccion titulo="Dirección de la visita">
              <Tarjeta style={{ gap: 10 }}>
                <Texto>{textoDireccionTurno(t)}</Texto>
                <TextoChico>{t.zone ? `Zona: ${t.zone}` : t.address ? 'Fuera de la zona de cobertura' : 'Sin dirección'}</TextoChico>
                {t.address ? (
                  <View style={s.fila}>
                    <View style={s.accion}><Boton compacto titulo="Google Maps" variante="secundario" onPress={() => abrirEnGoogleMaps(textoDireccionTurno(t))} /></View>
                    <View style={s.accion}><Boton compacto titulo="Waze" variante="secundario" onPress={() => abrirEnWaze(textoDireccionTurno(t))} /></View>
                  </View>
                ) : null}
              </Tarjeta>
            </Seccion>
          ) : null}

          <Seccion titulo={rol === 'medico' ? 'Motivo y notas' : 'Notas'}>
            <Tarjeta style={{ gap: 8 }}>
              {rol === 'medico' ? <Dato titulo="Motivo general">{t.reason || 'Sin motivo cargado'}</Dato> : null}
              <Dato titulo="Notas operativas (no las ve la familia)">{t.opsNotes || 'Sin notas'}</Dato>
              {t.porIdentificar ? (
                <Dato titulo="Contacto de quien lo pidió">
                  {[t.porIdentificar.name, t.porIdentificar.dni && `DNI ${t.porIdentificar.dni}`, t.porIdentificar.phone, t.porIdentificar.email].filter(Boolean).join(' · ')}
                </Dato>
              ) : null}
            </Tarjeta>
          </Seccion>
        </View>

        <View style={s.columna}>
          <Seccion titulo="Historial">
            {historial.length === 0 ? <Texto color={colors.textMuted}>Sin cambios registrados.</Texto> : null}
            {[...historial].reverse().map((h) => (
              <View key={h.id} style={s.cambio}>
                <Ionicons name="time-outline" size={18} color={colors.primary3} />
                <View style={{ flex: 1, gap: 2 }}>
                  <TextoFuerte>{TEXTO_ACCION_TURNO[h.action]}</TextoFuerte>
                  <TextoChico>{fechaHoraCorta(h.at)} · {actor(h)}</TextoChico>
                  {h.before && h.after && h.before.start !== h.after.start ? (
                    <TextoChico>De {fechaHoraCorta(h.before.start)} a {fechaHoraCorta(h.after.start)}</TextoChico>
                  ) : null}
                  {h.before && h.after && h.before.status !== h.after.status ? (
                    <TextoChico>{TEXTO_ESTADO_TURNO[h.before.status]} → {TEXTO_ESTADO_TURNO[h.after.status]}</TextoChico>
                  ) : null}
                  {h.reason ? <TextoChico>Motivo: {h.reason}</TextoChico> : null}
                </View>
              </View>
            ))}
          </Seccion>
        </View>
      </View>

      <DialogoConfirmar
        visible={preguntarAusente}
        titulo="¿Marcar como ausente?"
        texto={`Nadie recibió la visita de las ${hora(t.start)}. El horario se libera y queda en el historial.`}
        confirmar="Marcar ausente"
        onCancelar={() => setPreguntarAusente(false)}
        onConfirmar={() => { setPreguntarAusente(false); ejecutar({ accion: 'ausente' }, 'Turno marcado como ausente.'); }}
      />
    </Pantalla>
  );
}

const Dato = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <View style={{ gap: 2 }}>
    <TextoChico>{titulo}</TextoChico>
    <Texto>{children}</Texto>
  </View>
);

const s = StyleSheet.create({
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accion: { flexGrow: 1, flexBasis: 160 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  columnas: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' },
  columna: { flexGrow: 1, flexBasis: 320, gap: 16 },
  cambio: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
