/** Piezas de la agenda: etiqueta de estado, tarjeta de turno y lista de avisos. */
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TEXTO_ESTADO_TURNO, TEXTO_TIPO_TURNO, horaDe, type Aviso, type EstadoTurno } from '@shared/agenda';
import type { Appointment } from '@/data/types';
import { useApp } from '@/data/store';
import { nombreDeTurno, textoDireccionTurno, TEXTO_MODALIDAD } from '@/data/selectores';
import { hora } from '@/lib/fechas';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Boton } from '@/components/Boton';
import { categorias, colors, fonts } from '@/theme';

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
  const apagado = t.status === 'cancelado' || t.status === 'ausente';
  const nombre = nombreDeTurno(db, t);
  return (
    <Tarjeta
      onPress={() => router.push(`/medico/turno/${t.id}`)}
      accessibilityLabel={`Turno de las ${hora(t.start)}: ${nombre}, ${TEXTO_ESTADO_TURNO[t.status]}`}
      style={[s.tarjeta, compacta && s.compacta, apagado && { opacity: 0.6 }]}
    >
      <View style={[s.hora, compacta && s.horaCompacta]}>
        <TextoFuerte style={compacta ? s.horaTextoChico : s.horaTexto} color={categorias.celeste.texto}>{hora(t.start)}</TextoFuerte>
        {!compacta ? <TextoChico>{horaFin(t)}</TextoChico> : null}
      </View>
      <View style={compacta ? { gap: 2 } : { flex: 1, gap: 4 }}>
        <TextoFuerte style={compacta ? { fontSize: 15 } : undefined} numberOfLines={compacta ? 2 : undefined}>{nombre}</TextoFuerte>
        {compacta ? (
          <TextoChico numberOfLines={1}>{TEXTO_TIPO_TURNO[t.type]}{t.status !== 'confirmado' ? ` · ${TEXTO_ESTADO_TURNO[t.status]}` : ''}</TextoChico>
        ) : (
          <>
            <View style={s.etiquetas}>
              <EtiquetaEstado estado={t.status} />
              <Etiqueta texto={TEXTO_TIPO_TURNO[t.type]} tono={t.type.startsWith('urgencia') ? 'azul' : 'celeste'} />
              {t.origin === 'calcom' ? <Etiqueta texto="Cal.com" tono="neutro" /> : null}
              {t.modality === 'domicilio' && t.address && !t.zone ? <Etiqueta texto="Fuera de zona" tono="naranja" /> : null}
            </View>
            <TextoChico>{t.modality === 'domicilio' ? textoDireccionTurno(t) : TEXTO_MODALIDAD[t.modality]}</TextoChico>
          </>
        )}
      </View>
      {!compacta ? <Ionicons name="chevron-forward" size={20} color={colors.primary3} /> : null}
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
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // En la semana las columnas son angostas: la hora va arriba y el nombre abajo.
  compacta: { padding: 10, gap: 6, flexDirection: 'column', alignItems: 'stretch' },
  hora: { minWidth: 64, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12, backgroundColor: categorias.celeste.fondo },
  horaCompacta: { minWidth: 0, alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
  horaTexto: { fontFamily: fonts.title, fontSize: 20, lineHeight: 24 },
  horaTextoChico: { fontSize: 14 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avisos: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: categorias.naranja.acento, backgroundColor: categorias.naranja.fondo },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
