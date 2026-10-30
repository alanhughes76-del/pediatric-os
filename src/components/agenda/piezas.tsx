/** Piezas de la agenda: etiqueta de estado, tarjeta de turno y lista de avisos. */
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TEXTO_ESTADO_TURNO, TEXTO_TIPO_TURNO, horaDe, type Aviso, type EstadoTurno } from '@shared/agenda';
import type { Appointment } from '@/data/types';
import { useApp } from '@/data/store';
import { useRolEquipo } from '@/navegacion/useRolEquipo';
import { nombreDeTurno, pacientesDeTurno, textoDireccionTurno, TEXTO_MODALIDAD } from '@/data/selectores';
import { edades } from '@/lib/edad';
import { hora } from '@/lib/fechas';
import { Avatar } from '@/components/Avatar';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Boton } from '@/components/Boton';
import { categorias, colors, fonts, size } from '@/theme';

const TONO: Record<EstadoTurno, 'naranja' | 'celeste' | 'verde' | 'neutro'> = {
  solicitado: 'naranja',
  pendiente: 'naranja',
  confirmado: 'celeste',
  realizado: 'verde',
  cancelado: 'neutro',
  ausente: 'neutro',
};

export const EtiquetaEstado = ({ estado }: { estado: EstadoTurno }) => <Etiqueta texto={TEXTO_ESTADO_TURNO[estado]} tono={TONO[estado]} />;

/** Hora de fin ("10:45"), en hora de Argentina. */
export const horaFin = (t: Pick<Appointment, 'start' | 'durationMin'>) => horaDe(Date.parse(t.start) + t.durationMin * 60_000);

/** Tarjeta de un turno en la agenda. `compacta` para la vista semanal. */
export function TarjetaTurno({ turno: t, compacta }: { turno: Appointment; compacta?: boolean }) {
  const { db } = useApp();
  const rol = useRolEquipo();
  const apagado = t.status === 'cancelado' || t.status === 'ausente';
  const nombre = nombreDeTurno(db, t);
  const etiqueta = `Turno de las ${hora(t.start)}: ${nombre}, ${TEXTO_ESTADO_TURNO[t.status]}`;
  const abrir = () => router.push(`/medico/turno/${t.id}`);

  if (compacta) {
    return (
      <Tarjeta onPress={abrir} accessibilityLabel={etiqueta} style={[s.compacta, apagado && { opacity: 0.6 }]}>
        <View style={s.horaCompacta}>
          <TextoFuerte style={s.horaTextoChico} color={categorias.celeste.texto}>{hora(t.start)}</TextoFuerte>
        </View>
        <View style={{ gap: 2 }}>
          <TextoFuerte style={{ fontSize: 15 }} numberOfLines={2}>{nombre}</TextoFuerte>
          <TextoChico numberOfLines={1}>{TEXTO_TIPO_TURNO[t.type]}{t.status !== 'confirmado' ? ` · ${TEXTO_ESTADO_TURNO[t.status]}` : ''}</TextoChico>
        </View>
      </Tarjeta>
    );
  }

  const pacientes = pacientesDeTurno(db, t);
  const porConfirmar = t.status === 'solicitado' || t.status === 'pendiente';
  return (
    <Tarjeta onPress={abrir} accessibilityLabel={etiqueta} style={[s.tarjeta, apagado && { opacity: 0.6 }]}>
      <View style={s.cuerpo}>
        {pacientes[0] ? <Avatar paciente={pacientes[0]} tamano={44} /> : <View style={s.sinPaciente}><Ionicons name="person-outline" size={22} color={colors.textMuted} /></View>}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <TextoFuerte>{nombre}</TextoFuerte>
          {pacientes.length === 1 ? <TextoChico>{edades(pacientes[0], undefined, 'abreviado').cronologica}</TextoChico> : null}
          {t.reason && rol === 'medico' ? <TextoChico>{t.reason}</TextoChico> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <TextoFuerte style={s.horaTexto}>{hora(t.start)}</TextoFuerte>
          <TextoChico>{horaFin(t)}</TextoChico>
        </View>
      </View>
      <View style={[s.franja, porConfirmar && { backgroundColor: categorias.naranja.fondo }]}>
        <View style={s.lugar}>
          <Ionicons name={t.modality === 'domicilio' ? 'location-outline' : 'videocam-outline'} size={18} color={colors.primary2} />
          <TextoChico style={{ flex: 1 }}>{t.modality === 'domicilio' ? textoDireccionTurno(t) : TEXTO_MODALIDAD[t.modality]}</TextoChico>
        </View>
        <View style={s.etiquetas}>
          <EtiquetaEstado estado={t.status} />
          <Etiqueta texto={TEXTO_TIPO_TURNO[t.type]} tono={t.type.startsWith('urgencia') ? 'azul' : 'celeste'} />
          {t.origin === 'calcom' ? <Etiqueta texto="Cal.com" tono="neutro" /> : null}
          {t.modality === 'domicilio' && t.address && !t.zone ? <Etiqueta texto="Fuera de zona" tono="naranja" /> : null}
        </View>
      </View>
    </Tarjeta>
  );
}

/** Avisos de un turno. Si se pueden pasar por alto, ofrece "Guardar igual". */
export function ListaAvisos({ avisos, onAceptar, onRevisar }: { avisos: Aviso[]; onAceptar: () => void; onRevisar: () => void }) {
  return (
    <View style={s.avisos} accessibilityRole="alert">
      <View style={s.fila}>
        <Ionicons name="warning" size={22} color={categorias.naranja.texto} />
        <TextoFuerte style={{ flex: 1 }} color={categorias.naranja.texto}>Antes de guardar, revisá:</TextoFuerte>
      </View>
      {avisos.map((a, i) => <Texto key={i}>• {a.mensaje}</Texto>)}
      <View style={s.botones}>
        <View style={{ flex: 1 }}><Boton titulo="Revisar" variante="contorno" compacto onPress={onRevisar} /></View>
        <View style={{ flex: 1 }}><Boton titulo="Guardar igual" compacto onPress={onAceptar} /></View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: { padding: 0 },
  cuerpo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  sinPaciente: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  // Sin `overflow: hidden` en la tarjeta (recortaría la sombra): la franja redondea sus propias esquinas.
  franja: { gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.muted, borderBottomLeftRadius: size.radiusGrande - 1, borderBottomRightRadius: size.radiusGrande - 1 },
  lugar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // En la semana las columnas son angostas: la hora va arriba y el nombre abajo.
  compacta: { padding: 10, gap: 6 },
  horaCompacta: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, backgroundColor: categorias.celeste.fondo },
  horaTexto: { fontFamily: fonts.title, fontSize: 20, lineHeight: 24 },
  horaTextoChico: { fontSize: 14 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avisos: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: categorias.naranja.acento, backgroundColor: categorias.naranja.fondo },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
