/**
 * "Hoy" del médico (prompt maestro 7.1): cifras del día, turnos de hoy en orden, lo que falta
 * confirmar, los próximos días, seguimientos pendientes y acceso al registro de accesos.
 * En pantalla ancha, turnos a la izquierda y seguimientos a la derecha; en el teléfono,
 * seguimientos primero y turnos abajo.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import {
  turnosDelDia, turnosEntre, porConfirmar, alergiasDe, pacientesDeTurno, nombreDeTurno, textoDireccionTurno, consultaDeTurno,
  seguimientosPendientes, sinRevisar, TEXTO_MODALIDAD,
} from '@/data/selectores';
import type { Appointment } from '@/data/types';
import { TEXTO_TIPO_TURNO, diaDe, sumarDiasA } from '@shared/agenda';
import { edades } from '@/lib/edad';
import { diaYFecha, hora, ahoraISO } from '@/lib/fechas';
import { abrirEnGoogleMaps, abrirEnWaze } from '@/lib/mapas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Seccion } from '@/components/Seccion';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { Avatar } from '@/components/Avatar';
import { SeguimientosPendientes } from '@/components/SeguimientosPendientes';
import { EtiquetaEstado, TarjetaTurno } from '@/components/agenda/piezas';
import { useAbrirConsulta } from '@/components/agenda/abrirConsulta';
import { useEscritorio } from '@/components/escritorio/Marco';
import { categorias, colors, fonts, type Categoria } from '@/theme';

type NombreIcono = keyof typeof Ionicons.glyphMap;

export default function Hoy() {
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
  const fiebre = db.fever.filter((f) => !f.archivedAt && sinRevisar(f)).length;
  const pacientes = db.patients.filter((p) => !p.archivedAt).length;

  const bloqueSeguimientos = (
    <Seccion titulo="Seguimientos pendientes" bajada="Notas aprobadas con bandera clínica">
      <SeguimientosPendientes />
    </Seccion>
  );
  const bloqueVisitas = (
    <>
      <Seccion titulo="Turnos de hoy" accion={<Boton titulo="+ Turno" compacto variante="secundario" onPress={() => router.push('/medico/turno/nuevo')} />}>
        {visitas.length === 0 ? <Texto color={colors.textMuted}>No hay turnos para hoy.</Texto> : null}
        {visitas.map((v) => <Visita key={v.id} turno={v} />)}
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
      <View>
        <TextoChico>{diaYFecha(hoy)}</TextoChico>
        <Titulo>{visitas.length === 0 ? 'Hoy no hay visitas' : `${visitas.length} ${visitas.length === 1 ? 'visita' : 'visitas'} hoy`}</Titulo>
      </View>

      <View style={s.cifras}>
        <Cifra color="celeste" icono="calendar-outline" numero={visitas.length} texto="Visitas hoy" detalle={`${atendidas} ${atendidas === 1 ? 'realizada' : 'realizadas'}`} onPress={() => router.navigate('/medico/agenda')} />
        <Cifra
          color="rosado"
          icono="flag-outline"
          numero={seguimientos.length}
          texto="Seguimientos"
          detalle={vencidos > 0 ? `${vencidos} ${vencidos === 1 ? 'vencido' : 'vencidos'}` : 'Ninguno vencido'}
          alerta={vencidos > 0}
        />
        <Cifra color="naranja" icono="thermometer-outline" numero={fiebre} texto="Fiebre sin revisar" detalle="Ver registros" onPress={() => router.navigate('/medico/fiebre')} />
        <Cifra color="verde" icono="people-outline" numero={pacientes} texto="Pacientes" detalle="Ver la lista" onPress={() => router.navigate('/medico/pacientes')} />
      </View>

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

function Cifra({ color, icono, numero, texto, detalle, alerta, onPress }: {
  color: Categoria; icono: NombreIcono; numero: number; texto: string; detalle: string; alerta?: boolean; onPress?: () => void;
}) {
  const c = categorias[color];
  // En el teléfono, sin ícono: las cifras van de a dos por fila y el texto no entra.
  const escritorio = useEscritorio();
  return (
    <Tarjeta style={s.cifra} onPress={onPress} accessibilityLabel={onPress ? `${texto}: ${numero}. ${detalle}` : undefined}>
      {escritorio ? <View style={[s.cifraIcono, { backgroundColor: c.fondo }]}><Ionicons name={icono} size={22} color={c.acento} /></View> : null}
      <View style={{ flex: 1 }}>
        <TextoChico>{texto}</TextoChico>
        <TextoFuerte style={s.cifraNumero}>{numero}</TextoFuerte>
        <TextoChico color={alerta ? colors.alert : c.texto} style={{ fontFamily: fonts.bodySemi }}>{detalle}</TextoChico>
      </View>
    </Tarjeta>
  );
}

function Visita({ turno: t }: { turno: Appointment }) {
  const { db, operaciones } = useApp();
  const escritorio = useEscritorio();
  const abrirConsulta = useAbrirConsulta();
  const pacientes = pacientesDeTurno(db, t);
  const primero = pacientes[0];
  const familia = db.families.find((f) => f.id === t.familyId);
  const direccion = textoDireccionTurno(t);
  const alergias = pacientes.flatMap((p) => alergiasDe(db, p.id, 'medico').filter((a) => a.status === 'confirmada'));
  const atendida = t.status === 'realizado';
  const sePuedeAtender = t.status === 'confirmado' || t.status === 'realizado';

  const abrir = (patientId: string) => {
    // Al abrir la consulta de un turno confirmado, el turno pasa a realizado.
    if (t.status === 'confirmado') void operaciones.accionTurno({ turno: t, accion: 'realizado' });
    abrirConsulta(t, patientId);
  };

  return (
    <Tarjeta style={{ gap: 14 }}>
      <View style={s.arriba}>
        <View style={[s.hora, atendida && { backgroundColor: colors.bg }]}>
          <TextoFuerte style={s.horaTexto} color={atendida ? colors.textMuted : categorias.celeste.texto}>{hora(t.start)}</TextoFuerte>
          <TextoChico>h</TextoChico>
        </View>
        {escritorio && primero ? <Avatar paciente={primero} /> : null}
        <View style={{ flex: 1, minWidth: 170, gap: 2 }}>
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
      </View>

      {t.modality === 'domicilio' ? (
        <View style={s.fila}>
          <Ionicons name="location-outline" size={22} color={colors.primary2} />
          <View style={{ flex: 1 }}>
            <Texto>{direccion}</Texto>
            {t.opsNotes ? <TextoChico>{t.opsNotes}</TextoChico> : null}
          </View>
        </View>
      ) : (
        <TextoChico>{TEXTO_MODALIDAD[t.modality]}</TextoChico>
      )}

      <View style={s.botones}>
        {sePuedeAtender ? pacientes.map((p) => (
          <Ancho key={p.id} completo>
            <Boton
              compacto
              titulo={`${consultaDeTurno(db, t.id, p.id) ? 'Ver consulta' : 'Abrir consulta'}${pacientes.length > 1 ? ` de ${p.firstName}` : ''}`}
              icono="create-outline"
              onPress={() => abrir(p.id)}
            />
          </Ancho>
        )) : null}
        <Ancho completo={!escritorio && !sePuedeAtender}>
          <Boton compacto titulo="Ver turno" icono="calendar-outline" variante={sePuedeAtender ? 'contorno' : 'principal'} onPress={() => router.push(`/medico/turno/${t.id}`)} />
        </Ancho>
        {t.modality === 'domicilio' && t.address ? (
          <>
            <Ancho><Boton compacto titulo="Google Maps" variante="secundario" onPress={() => abrirEnGoogleMaps(direccion)} /></Ancho>
            <Ancho><Boton compacto titulo="Waze" variante="secundario" onPress={() => abrirEnWaze(direccion)} /></Ancho>
          </>
        ) : null}
      </View>
    </Tarjeta>
  );
}

/** Botón que comparte la fila; `completo` ocupa la fila entera ("Abrir consulta", la acción principal). */
const Ancho = ({ children, completo }: { children: ReactNode; completo?: boolean }) => <View style={[s.boton, completo && { flexBasis: '100%' }]}>{children}</View>;

const s = StyleSheet.create({
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cifra: { flexGrow: 1, flexBasis: 150, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cifraIcono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cifraNumero: { fontFamily: fonts.title, fontSize: 30, lineHeight: 36, color: colors.primary },
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  arriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  hora: { minWidth: 76, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, backgroundColor: categorias.celeste.fondo },
  horaTexto: { fontFamily: fonts.title, fontSize: 24, lineHeight: 28 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  fila: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boton: { flexGrow: 1, flexBasis: 120 },
});
