/**
 * "Hoy" del médico (prompt maestro 7.1): cifras del día, la próxima salida, la fiebre sin revisar,
 * turnos de hoy en orden, lo que falta confirmar, los próximos días, seguimientos pendientes y
 * acceso al registro de accesos. En pantalla ancha, turnos a la izquierda y seguimientos a la
 * derecha; en el teléfono, seguimientos primero y turnos abajo.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import {
  turnosDelDia, turnosEntre, porConfirmar, alergiasDe, pacientesDeTurno, nombreDeTurno, textoDireccionTurno, consultaDeTurno,
  seguimientosPendientes, sinRevisar, paciente, nombreCompleto, TEXTO_MODALIDAD,
} from '@/data/selectores';
import type { Appointment, FeverEntry } from '@/data/types';
import { TEXTO_TIPO_TURNO, diaDe, sumarDiasA } from '@shared/agenda';
import { edades } from '@/lib/edad';
import { diaYFecha, duracion, fechaHoraCorta, hora, horasEntre, ahoraISO } from '@/lib/fechas';
import { UMBRAL_FIEBRE, grados } from '@/lib/fiebre';
import { abrirEnGoogleMaps, abrirEnWaze } from '@/lib/mapas';
import { Pantalla } from '@/components/Pantalla';
import { Antetitulo, Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { ChipNoche, TarjetaNoche } from '@/components/TarjetaNoche';
import { Seccion } from '@/components/Seccion';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { Avatar } from '@/components/Avatar';
import { SeguimientosPendientes } from '@/components/SeguimientosPendientes';
import { EtiquetaEstado, TarjetaTurno } from '@/components/agenda/piezas';
import { useAbrirConsulta } from '@/components/agenda/abrirConsulta';
import { useEscritorio } from '@/components/escritorio/Marco';
import { categorias, colors, fonts, type Categoria } from '@/theme';
import { useRolEquipo } from '@/navegacion/useRolEquipo';
import { InicioAsistente } from '@/components/InicioAsistente';
import { Saludo } from '@/components/Saludo';
import { fraseDeEstacion, saludoDeHora } from '@/lib/estacion';

type NombreIcono = keyof typeof Ionicons.glyphMap;

/** El asistente tiene su propio Inicio, sin nada clínico. */
export default function Inicio() {
  return useRolEquipo() === 'asistente' ? <InicioAsistente /> : <Hoy />;
}

function Hoy() {
  const { db } = useApp();
  const escritorio = useEscritorio();
  const hoy = diaDe(ahoraISO());
  const visitas = turnosDelDia(db, hoy);
  const atendidas = visitas.filter((v) => v.status === 'realizado').length;
  const pendientes = porConfirmar(db, hoy);
  const proximos = turnosEntre(db, sumarDiasA(hoy, 1), sumarDiasA(hoy, 3)).filter((t) => t.status === 'confirmado');
  const seguimientos = seguimientosPendientes(db);
  const ahora = ahoraISO();
  const vencidos = seguimientos.filter((f) => f.dueAt < ahora).length;
  const fiebreSinRevisar = db.fever.filter((f) => !f.archivedAt && sinRevisar(f));
  const fiebreAlta = fiebreSinRevisar
    .filter((f) => f.kind === 'toma' && (f.temperatureC ?? 0) >= UMBRAL_FIEBRE)
    .sort((a, b) => b.at.localeCompare(a.at));
  // La próxima visita confirmada que todavía no terminó. Va destacada arriba, no se repite en la lista.
  const proxima = visitas.find((v) => v.status === 'confirmado' && Date.parse(v.start) + v.durationMin * 60_000 > Date.parse(ahora));
  const resto = visitas.filter((v) => v !== proxima);
  const pacientes = db.patients.filter((p) => !p.archivedAt).length;

  const bloqueSeguimientos = (
    <Seccion titulo="Seguimientos pendientes" bajada="Notas aprobadas con bandera clínica">
      <SeguimientosPendientes />
    </Seccion>
  );
  const bloqueVisitas = (
    <>
      <Seccion titulo="Ruta de visitas de hoy" accion={<Boton titulo="+ Turno" compacto variante="secundario" onPress={() => router.push('/medico/turno/nuevo')} />}>
        {resto.length === 0 ? <Texto color={colors.textMuted}>{proxima ? 'No hay más turnos para hoy.' : 'No hay turnos para hoy.'}</Texto> : null}
        {resto.map((v) => <Visita key={v.id} turno={v} />)}
      </Seccion>
      {pendientes.length > 0 ? (
        <Seccion titulo="Por confirmar" bajada="Solicitudes nuevas y turnos pendientes">
          {pendientes.map((t) => (
            <View key={t.id} style={{ gap: 4 }}>
              <TextoChico>{diaYFecha(t.day)}</TextoChico>
              <TarjetaTurno turno={t} />
            </View>
          ))}
        </Seccion>
      ) : null}
      <Seccion titulo="Próximos días" accion={<Boton titulo="Ver agenda" compacto variante="contorno" onPress={() => router.navigate('/medico/agenda')} />}>
        {proximos.length === 0 ? <Texto color={colors.textMuted}>No hay turnos confirmados en los próximos tres días.</Texto> : null}
        {proximos.map((t) => (
          <View key={t.id} style={{ gap: 4 }}>
            <TextoChico>{diaYFecha(t.day)}</TextoChico>
            <TarjetaTurno turno={t} />
          </View>
        ))}
      </Seccion>
    </>
  );
  const botonAccesos = (
    <Boton titulo="Registro de accesos al portal" icono="log-in-outline" variante="contorno" onPress={() => router.push('/medico/accesos')} />
  );

  return (
    <Pantalla ancho>
      <View style={{ gap: 2 }}>
        <Antetitulo>{diaYFecha(hoy)}</Antetitulo>
        <Saludo texto={saludoDeHora(hora(ahora), db.doctor.name)} izquierda />
        <View style={s.estacion}>
          <Ionicons name="leaf-outline" size={16} color={categorias.verde.acento} />
          <TextoChico style={{ flex: 1 }}>{fraseDeEstacion(hoy)}</TextoChico>
        </View>
      </View>

      <View style={s.cifras}>
        <Cifra color="celeste" icono="calendar-outline" antetitulo="Hoy" numero={visitas.length} texto="Visitas" detalle={`${atendidas} ${atendidas === 1 ? 'realizada' : 'realizadas'}`} onPress={() => router.navigate('/medico/agenda')} />
        <Cifra
          color="rosado"
          icono="flag-outline"
          antetitulo="Seguimientos"
          numero={seguimientos.length}
          texto="Pendientes"
          detalle={vencidos > 0 ? `${vencidos} ${vencidos === 1 ? 'vencido' : 'vencidos'}` : 'Ninguno vencido'}
          alerta={vencidos > 0}
        />
        <Cifra color="naranja" icono="thermometer-outline" antetitulo="Fiebre" numero={fiebreSinRevisar.length} texto="Sin revisar" detalle="Ver registros" onPress={() => router.navigate('/medico/fiebre')} />
        <Cifra color="verde" icono="people-outline" antetitulo="Pacientes" numero={pacientes} texto="Activos" detalle="Ver la lista" onPress={() => router.navigate('/medico/pacientes')} />
      </View>

      {proxima ? <ProximaSalida turno={proxima} ahora={ahora} /> : null}
      {fiebreAlta.length > 0 ? <AvisoFiebre registros={fiebreAlta} /> : null}

      {escritorio ? (
        <View style={s.columnas}>
          <View style={{ flex: 3, gap: 16 }}>{bloqueVisitas}</View>
          <View style={{ flex: 2, gap: 16 }}>
            {bloqueSeguimientos}
            {botonAccesos}
          </View>
        </View>
      ) : (
        <>
          {bloqueSeguimientos}
          {botonAccesos}
          {bloqueVisitas}
        </>
      )}
    </Pantalla>
  );
}

function Cifra({ color, icono, antetitulo, numero, texto, detalle, alerta, onPress }: {
  color: Categoria; icono: NombreIcono; antetitulo: string; numero: number; texto: string; detalle: string; alerta?: boolean; onPress?: () => void;
}) {
  const c = categorias[color];
  return (
    <Tarjeta style={[s.cifra, { backgroundColor: c.fondo }]} onPress={onPress} accessibilityLabel={onPress ? `${antetitulo}: ${numero}. ${texto}. ${detalle}` : undefined}>
      <View style={s.cifraCabecera}>
        <Antetitulo color={c.texto} style={{ flex: 1 }}>{antetitulo}</Antetitulo>
        <Ionicons name={icono} size={20} color={c.acento} />
      </View>
      <TextoFuerte style={s.cifraNumero}>{numero}</TextoFuerte>
      <TextoChico color={c.texto}>{texto}</TextoChico>
      <TextoChico color={alerta ? colors.alert : c.texto} style={{ fontFamily: fonts.bodySemi }}>{detalle}</TextoChico>
    </Tarjeta>
  );
}

/** La próxima salida en azul noche, con cuánto falta. Tiene las mismas acciones que el resto de las visitas. */
function ProximaSalida({ turno: t, ahora }: { turno: Appointment; ahora: string }) {
  const { db } = useApp();
  const pacientes = pacientesDeTurno(db, t);
  const alergias = pacientes.flatMap((p) => alergiasDe(db, p.id, 'medico').filter((a) => a.status === 'confirmada'));
  const falta = horasEntre(ahora, t.start);
  return (
    <TarjetaNoche>
      <View style={s.chips}>
        <ChipNoche texto={`${t.modality === 'domicilio' ? 'Próxima salida' : 'Próxima visita'} · ${hora(t.start)} h`} />
        <ChipNoche texto={falta > 0 ? `En ${duracion(falta)}` : 'Ahora'} icono="time-outline" />
      </View>
      <Titulo style={{ color: colors.white }}>{nombreDeTurno(db, t)}</Titulo>
      <Texto color={colors.bgSoft}>
        {TEXTO_TIPO_TURNO[t.type]}{pacientes.length === 1 ? ` · ${edades(pacientes[0], undefined, 'abreviado').cronologica}` : ''}
      </Texto>
      {t.modality === 'domicilio' ? (
        <View style={s.fila}>
          <Ionicons name="location-outline" size={20} color={colors.sky} />
          <Texto style={{ flex: 1 }} color={colors.white}>{textoDireccionTurno(t)}</Texto>
        </View>
      ) : <Texto color={colors.white}>{TEXTO_MODALIDAD[t.modality]}</Texto>}
      {t.reason ? <Texto color={colors.white}>Motivo: {t.reason}</Texto> : null}
      {t.opsNotes ? <TextoChico color={colors.bgSoft}>{t.opsNotes}</TextoChico> : null}
      {alergias.length > 0 ? <View style={s.etiquetas}><Etiqueta tono="alerta" texto={`Alergia: ${alergias.map((a) => a.allergen).join(', ')}`} /></View> : null}
      <AccionesVisita turno={t} sobreNoche />
    </TarjetaNoche>
  );
}

/** La toma de fiebre más reciente sin revisar, de 38 °C o más. */
function AvisoFiebre({ registros }: { registros: FeverEntry[] }) {
  const { db } = useApp();
  const r = registros[0];
  const p = paciente(db, r.patientId);
  if (!p) return null;
  const otros = registros.length - 1;
  return (
    <Tarjeta style={s.fiebre} onPress={() => router.push(`/medico/fiebre/${p.id}`)} accessibilityLabel={`Fiebre sin revisar: ${nombreCompleto(p)}, ${grados(r.temperatureC ?? 0)}`}>
      <View style={s.fiebreIcono}><Ionicons name="thermometer-outline" size={24} color={colors.alert} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Antetitulo color={colors.alert}>Fiebre sin revisar</Antetitulo>
        <TextoFuerte>{nombreCompleto(p)}</TextoFuerte>
        <TextoChico>{fechaHoraCorta(r.at)}{otros > 0 ? ` · y ${otros} ${otros === 1 ? 'toma más' : 'tomas más'}` : ''}</TextoChico>
      </View>
      <Etiqueta tono="alerta" texto={grados(r.temperatureC ?? 0)} />
    </Tarjeta>
  );
}

function Visita({ turno: t }: { turno: Appointment }) {
  const { db } = useApp();
  const pacientes = pacientesDeTurno(db, t);
  const primero = pacientes[0];
  const familia = db.families.find((f) => f.id === t.familyId);
  const alergias = pacientes.flatMap((p) => alergiasDe(db, p.id, 'medico').filter((a) => a.status === 'confirmada'));
  const atendida = t.status === 'realizado';

  return (
    <Tarjeta style={{ gap: 14 }}>
      <View style={s.arriba}>
        {primero ? <Avatar paciente={primero} /> : null}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <TextoFuerte style={{ fontSize: 20 }}>{nombreDeTurno(db, t)}</TextoFuerte>
          <TextoChico>
            {pacientes.length === 1 ? edades(primero, undefined, 'abreviado').cronologica : ''}
            {pacientes.length === 1 && familia ? ' · ' : ''}
            {familia ? familia.name : ''}
          </TextoChico>
          <View style={s.etiquetas}>
            <Etiqueta texto={TEXTO_TIPO_TURNO[t.type]} tono={t.type.startsWith('urgencia') ? 'azul' : 'celeste'} />
            {t.status !== 'confirmado' ? <EtiquetaEstado estado={t.status} /> : null}
            {alergias.length > 0 ? <Etiqueta tono="alerta" texto={`Alergia: ${alergias.map((a) => a.allergen).join(', ')}`} /> : null}
          </View>
        </View>
        <View style={s.hora}>
          <TextoFuerte style={s.horaTexto} color={atendida ? colors.textMuted : colors.primary}>{hora(t.start)}</TextoFuerte>
          <TextoChico>h</TextoChico>
        </View>
      </View>

      {t.reason ? <Texto>{t.reason}</Texto> : null}

      {t.modality === 'domicilio' ? (
        <View style={s.fila}>
          <Ionicons name="location-outline" size={22} color={colors.primary2} />
          <View style={{ flex: 1 }}>
            <Texto>{textoDireccionTurno(t)}</Texto>
            {t.opsNotes ? <TextoChico>{t.opsNotes}</TextoChico> : null}
          </View>
        </View>
      ) : (
        <TextoChico>{TEXTO_MODALIDAD[t.modality]}</TextoChico>
      )}

      <AccionesVisita turno={t} />
    </Tarjeta>
  );
}

/** Abrir consulta, ver el turno, ficha clínica y mapas. `sobreNoche`: sin botones azul noche, que no se verían. */
function AccionesVisita({ turno: t, sobreNoche }: { turno: Appointment; sobreNoche?: boolean }) {
  const { db, operaciones } = useApp();
  const escritorio = useEscritorio();
  const abrirConsulta = useAbrirConsulta();
  const pacientes = pacientesDeTurno(db, t);
  const direccion = textoDireccionTurno(t);
  const sePuedeAtender = t.status === 'confirmado' || t.status === 'realizado';

  const abrir = (patientId: string) => {
    // Al abrir la consulta de un turno confirmado, el turno pasa a realizado.
    if (t.status === 'confirmado') void operaciones.accionTurno({ turno: t, accion: 'realizado' });
    abrirConsulta(t, patientId);
  };

  return (
    <View style={s.botones}>
      {sePuedeAtender ? pacientes.map((p) => (
        <Ancho key={p.id} completo>
          <Boton
            compacto
            titulo={`${consultaDeTurno(db, t.id, p.id) ? 'Ver consulta' : 'Abrir consulta'}${pacientes.length > 1 ? ` de ${p.firstName}` : ''}`}
            icono="create-outline"
            variante={sobreNoche ? 'contorno' : 'principal'}
            onPress={() => abrir(p.id)}
          />
        </Ancho>
      )) : null}
      <Ancho completo={!escritorio && !sePuedeAtender && pacientes.length === 0}>
        <Boton compacto titulo="Ver turno" variante={sobreNoche ? 'secundario' : sePuedeAtender ? 'contorno' : 'principal'} onPress={() => router.push(`/medico/turno/${t.id}`)} />
      </Ancho>
      {pacientes.map((p) => (
        <Ancho key={p.id}>
          <Boton compacto titulo={pacientes.length > 1 ? `Ficha de ${p.firstName}` : 'Ficha clínica'} variante="secundario" onPress={() => router.push(`/medico/hijo/${p.id}`)} />
        </Ancho>
      ))}
      {t.modality === 'domicilio' && t.address ? (
        <>
          <Ancho><Boton compacto titulo="Google Maps" variante="secundario" onPress={() => abrirEnGoogleMaps(direccion)} /></Ancho>
          <Ancho><Boton compacto titulo="Waze" variante="secundario" onPress={() => abrirEnWaze(direccion)} /></Ancho>
        </>
      ) : null}
    </View>
  );
}

/** Botón que comparte la fila; `completo` ocupa la fila entera ("Abrir consulta", la acción principal). */
const Ancho = ({ children, completo }: { children: ReactNode; completo?: boolean }) => <View style={[s.boton, completo && { flexBasis: '100%' }]}>{children}</View>;

const s = StyleSheet.create({
  estacion: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cifra: { flexGrow: 1, flexBasis: 150, gap: 2, padding: 16 },
  cifraCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cifraNumero: { fontFamily: fonts.title, fontSize: 36, lineHeight: 44, color: colors.primary },
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  fiebre: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.muted, boxShadow: 'none' },
  fiebreIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.alertBg },
  arriba: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hora: { alignItems: 'flex-end' },
  horaTexto: { fontFamily: fonts.title, fontSize: 22, lineHeight: 26 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  fila: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  boton: { flexGrow: 1, flexBasis: 120 },
});
