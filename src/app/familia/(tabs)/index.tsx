import { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, useSesionFamilia } from '@/data/store';
import { pacientesDeAdulto, proximoTurno, membresiaDeFamilia, textoDireccionTurno } from '@/data/selectores';
import { TEXTO_TIPO_TURNO } from '@shared/agenda';
import { cuandoEs, hora, fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { Titulo, Subtitulo, Texto, TextoChico } from '@/components/Texto';
import { FichaHijo } from '@/components/FichaHijo';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { Avatar } from '@/components/Avatar';
import { Saludo } from '@/components/Saludo';
import { categorias, colors, fonts, size } from '@/theme';

export default function InicioFamilia() {
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  const hijos = pacientesDeAdulto(db, guardian.id);
  const familia = db.families.find((f) => f.id === (hijos[0]?.familyId ?? guardian.familyId));
  const proxima = proximoTurno(db, hijos.map((h) => h.id));
  const { membership, estado } = membresiaDeFamilia(db, familia?.id);
  const nombreDe = (id: string) => hijos.find((h) => h.id === id)?.firstName ?? '';
  const [elegidoId, setElegidoId] = useState<string | undefined>(undefined);
  const elegido = hijos.find((h) => h.id === elegidoId) ?? hijos[0];

  return (
    <Pantalla ancho pie={<BarraPacienteX />}>
      <View>
        <Saludo texto="Qué bueno verte" izquierda />
        <Titulo>Hola, {guardian.firstName}</Titulo>
        {familia ? <Texto color={colors.textMuted}>{familia.name}</Texto> : null}
      </View>

      <View style={s.arriba}>
        <Tarjeta style={s.proxima}>
          <TextoChico color={colors.bgSoft}>PRÓXIMA VISITA</TextoChico>
          {proxima ? (
            <>
              <Subtitulo color={colors.white}>{cuandoEs(proxima.start)}, {hora(proxima.start)} h</Subtitulo>
              <Texto color={colors.white}>
                {TEXTO_TIPO_TURNO[proxima.type]} · {proxima.patientIds.map(nombreDe).filter(Boolean).join(' y ')}
                {proxima.status === 'pendiente' ? ' · A confirmar' : ''}
              </Texto>
              <TextoChico color={colors.bgSoft}>{textoDireccionTurno(proxima)}</TextoChico>
            </>
          ) : (
            <Texto color={colors.white}>No tenés visitas programadas.</Texto>
          )}
        </Tarjeta>

        <View style={s.costado}>
          {membership && estado !== 'cancelada' ? (
            estado === 'vencida' || estado === 'suspendida' ? (
              <View style={[s.banner, s.bannerVencida]}>
                <Ionicons name="information-circle" size={24} color={colors.alert} />
                <Texto style={{ flex: 1 }}>
                  Membresía {estado}. Seguís teniendo acceso de lectura a toda la información de tus hijos.
                </Texto>
              </View>
            ) : (
              <View style={s.banner}>
                <Ionicons name="checkmark-circle" size={24} color={categorias.verde.acento} />
                <Texto style={{ flex: 1 }} color={categorias.verde.texto}>Membresía activa · se renueva el {fechaCorta(membership.renewalDate)}</Texto>
              </View>
            )
          ) : null}
          <Boton titulo="Pedí una visita" icono="calendar" variante="secundario" onPress={() => router.navigate('/familia/pedir')} />
        </View>
      </View>

      {hijos.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Subtitulo style={{ marginTop: 8 }}>Tus hijos</Subtitulo>
          <View style={s.selector} accessibilityRole="tablist">
            {hijos.map((h) => {
              const activo = h.id === elegido?.id;
              return (
                <Pressable key={h.id} onPress={() => setElegidoId(h.id)} accessibilityRole="tab" accessibilityState={{ selected: activo }} style={[s.hijo, activo && s.hijoActivo]}>
                  <Avatar paciente={h} tamano={36} />
                  <Text style={[s.hijoTexto, activo && { color: colors.white }]}>{h.firstName}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {elegido ? <FichaHijo key={elegido.id} hijoId={elegido.id} /> : <Texto color={colors.textMuted}>Todavía no hay chicos vinculados.</Texto>}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  costado: { flexGrow: 1, flexBasis: 280, gap: 12, justifyContent: 'center' },
  banner: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: categorias.verde.fondo, borderRadius: size.radiusGrande, padding: 16,
  },
  bannerVencida: { backgroundColor: colors.alertBg, borderWidth: 1, borderColor: colors.alertBorder, alignItems: 'flex-start' },
  proxima: { flexGrow: 2, flexBasis: 340, backgroundColor: colors.accion, borderColor: colors.accion, gap: 6, padding: 24 },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hijo: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8, paddingRight: 22, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary3, backgroundColor: colors.white, justifyContent: 'center' },
  hijoActivo: { backgroundColor: colors.accion, borderColor: colors.accion },
  hijoTexto: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.primary },
});
