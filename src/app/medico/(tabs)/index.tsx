/**
 * "Hoy" del médico: cifras del día, visitas del día, seguimientos pendientes y acceso al
 * registro de accesos. En pantalla ancha, visitas a la izquierda y seguimientos a la derecha;
 * en el teléfono, seguimientos primero y visitas abajo.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import {
  visitasDelDia, alergiasDe, paciente, nombreCompleto, domicilioDe, textoDomicilio, seguimientosPendientes, sinRevisar,
  TEXTO_VISITA, TEXTO_MODALIDAD, esUrgencia,
} from '@/data/selectores';
import type { Consultation } from '@/data/types';
import { edades } from '@/lib/edad';
import { hoyISO, diaYFecha, hora, ahoraISO } from '@/lib/fechas';
import { abrirEnGoogleMaps, abrirEnWaze } from '@/lib/mapas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Seccion } from '@/components/Seccion';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { Avatar } from '@/components/Avatar';
import { SeguimientosPendientes } from '@/components/SeguimientosPendientes';
import { useEscritorio } from '@/components/escritorio/Marco';
import { categorias, colors, fonts, type Categoria } from '@/theme';

type NombreIcono = keyof typeof Ionicons.glyphMap;

export default function Hoy() {
  const { db } = useApp();
  const escritorio = useEscritorio();
  const visitas = visitasDelDia(db);
  const atendidas = visitas.filter((v) => v.status === 'realizada').length;
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
    <Seccion titulo="Visitas del día">
      {visitas.length === 0 ? <Texto color={colors.textMuted}>No hay visitas para hoy.</Texto> : null}
      {visitas.map((v) => <Visita key={v.id} visita={v} />)}
    </Seccion>
  );
  const botonAccesos = (
    <Boton titulo="Registro de accesos al portal" icono="log-in-outline" variante="contorno" onPress={() => router.push('/medico/accesos')} />
  );

  return (
    <Pantalla ancho>
      <View>
        <TextoChico>{diaYFecha(hoyISO())}</TextoChico>
        <Titulo>{visitas.length === 0 ? 'Hoy no hay visitas' : `${visitas.length} ${visitas.length === 1 ? 'visita' : 'visitas'} hoy`}</Titulo>
      </View>

      <View style={s.cifras}>
        <Cifra color="celeste" icono="calendar-outline" numero={visitas.length} texto="Visitas hoy" detalle={`${atendidas} ${atendidas === 1 ? 'atendida' : 'atendidas'}`} />
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

function Visita({ visita: v }: { visita: Consultation }) {
  const { db, actualizar } = useApp();
  const escritorio = useEscritorio();
  const p = paciente(db, v.patientId);
  if (!p) return null;
  const familia = db.families.find((f) => f.id === p.familyId);
  const domicilio = domicilioDe(db, v);
  const direccion = textoDomicilio(domicilio);
  const alergias = alergiasDe(db, p.id, 'medico').filter((a) => a.status === 'confirmada');
  const atendida = v.status === 'realizada';

  return (
    <Tarjeta style={{ gap: 14 }}>
      <View style={s.arriba}>
        <View style={[s.hora, atendida && { backgroundColor: colors.bg }]}>
          <TextoFuerte style={s.horaTexto} color={atendida ? colors.textMuted : categorias.celeste.texto}>{hora(v.occurredAt)}</TextoFuerte>
          <TextoChico>h</TextoChico>
        </View>
        {escritorio ? <Avatar paciente={p} /> : null}
        <View style={{ flex: 1, minWidth: 170, gap: 2 }}>
          <TextoFuerte style={{ fontSize: 20 }}>{nombreCompleto(p)}</TextoFuerte>
          <TextoChico>{edades(p, undefined, 'abreviado').cronologica}{familia ? ` · ${familia.name}` : ''}</TextoChico>
          <View style={s.etiquetas}>
            <Etiqueta texto={TEXTO_VISITA[v.visitType]} tono={esUrgencia(v.visitType) ? 'azul' : 'celeste'} />
            {atendida ? <Etiqueta texto="Atendida" tono="neutro" /> : null}
            {alergias.length > 0 ? <Etiqueta tono="alerta" texto={`Alergia: ${alergias.map((a) => a.allergen).join(', ')}`} /> : null}
          </View>
        </View>
      </View>

      {v.modality === 'domicilio' ? (
        <View style={s.fila}>
          <Ionicons name="location-outline" size={22} color={colors.primary2} />
          <View style={{ flex: 1 }}>
            <Texto>{direccion}</Texto>
            {domicilio?.notes ? <TextoChico>{domicilio.notes}</TextoChico> : null}
          </View>
        </View>
      ) : (
        <TextoChico>{TEXTO_MODALIDAD[v.modality]}</TextoChico>
      )}

      <View style={s.botones}>
        <Ancho completo>
          <Boton
            compacto
            titulo="Abrir consulta"
            icono="create-outline"
            onPress={() => {
              // Al abrirla, el turno pasa a ser una consulta realizada.
              if (v.status === 'programada') actualizar('consultations', v.id, { status: 'realizada' }, 'consulta.abrir');
              router.push(`/medico/consulta/${v.id}`);
            }}
          />
        </Ancho>
        <Ancho completo={!escritorio}><Boton compacto titulo="Ver ficha" icono="document-text-outline" variante="contorno" onPress={() => router.push(`/medico/hijo/${p.id}`)} /></Ancho>
        {v.modality === 'domicilio' && domicilio ? (
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
