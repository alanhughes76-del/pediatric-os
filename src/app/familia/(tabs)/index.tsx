import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, useSesionFamilia } from '@/data/store';
import { pacientesDeAdulto, proximaVisita, membresiaDeFamilia, alergiasDe, domicilioDe, textoDomicilio, TEXTO_VISITA } from '@/data/selectores';
import { edades } from '@/lib/edad';
import { cuandoEs, hora, fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { Titulo, Subtitulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { colors, fonts, size } from '@/theme';

export default function InicioFamilia() {
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  const hijos = pacientesDeAdulto(db, guardian.id);
  const familia = db.families.find((f) => f.id === (hijos[0]?.familyId ?? guardian.familyId));
  const proxima = proximaVisita(db, hijos.map((h) => h.id));
  const { membership, estado } = membresiaDeFamilia(db, familia?.id);
  const nombreDe = (id: string) => hijos.find((h) => h.id === id)?.firstName ?? '';

  return (
    <Pantalla pie={<BarraPacienteX />}>
      <View>
        <Titulo>Hola, {guardian.firstName}</Titulo>
        {familia ? <Texto color={colors.textMuted}>{familia.name}</Texto> : null}
      </View>

      {membership ? (
        estado === 'vencida' ? (
          <View style={[s.banner, s.bannerVencida]}>
            <Ionicons name="information-circle" size={24} color={colors.alert} />
            <Texto style={{ flex: 1 }}>
              Membresía vencida el {fechaCorta(membership.renewalDate)}. Seguís teniendo acceso a toda la documentación de tus hijos.
            </Texto>
          </View>
        ) : (
          <View style={s.banner}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary2} />
            <Texto style={{ flex: 1 }}>Membresía activa · se renueva el {fechaCorta(membership.renewalDate)}</Texto>
          </View>
        )
      ) : null}

      <Tarjeta style={s.proxima}>
        <TextoChico color={colors.bgSoft}>PRÓXIMA VISITA</TextoChico>
        {proxima ? (
          <>
            <Subtitulo color={colors.white}>{cuandoEs(proxima.occurredAt)}, {hora(proxima.occurredAt)} h</Subtitulo>
            <Texto color={colors.white}>{TEXTO_VISITA[proxima.visitType]} · {nombreDe(proxima.patientId)}</Texto>
            <TextoChico color={colors.bgSoft}>{textoDomicilio(domicilioDe(db, proxima))}</TextoChico>
          </>
        ) : (
          <Texto color={colors.white}>No tenés visitas programadas.</Texto>
        )}
      </Tarjeta>

      <Boton titulo="Pedí una visita" icono="calendar" variante="secundario" onPress={() => router.navigate('/familia/pedir')} />

      <Subtitulo style={{ marginTop: 8 }}>{hijos.length === 1 ? 'Tu hijo' : 'Tus hijos'}</Subtitulo>
      {hijos.map((h) => {
        const e = edades(h);
        const alergias = alergiasDe(db, h.id, 'familia');
        return (
          <Tarjeta key={h.id} onPress={() => router.push(`/familia/hijo/${h.id}`)} accessibilityLabel={`Ver la ficha de ${h.firstName}`}>
            <View style={s.filaHijo}>
              <View style={s.avatar}>
                <TextoFuerte color={colors.primary} style={{ fontSize: 22 }}>{h.firstName[0]}</TextoFuerte>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto style={s.nombreHijo}>{h.firstName}</Texto>
                <Texto color={colors.textMuted}>{e.cronologica}</Texto>
                {e.corregida ? <TextoChico>Edad corregida: {e.corregida}</TextoChico> : null}
                {alergias.length > 0 ? (
                  <View style={{ marginTop: 6 }}>
                    <Etiqueta tono="alerta" texto={`Alergia: ${alergias.map((a) => a.allergen).join(', ')}`} />
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={26} color={colors.primary3} />
            </View>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: colors.bgSoft, borderColor: colors.border, borderWidth: 1, borderRadius: size.radius, padding: 14,
  },
  bannerVencida: { backgroundColor: colors.alertBg, borderColor: colors.alertBorder, alignItems: 'flex-start' },
  proxima: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 6 },
  filaHijo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
  nombreHijo: { fontSize: 22, fontFamily: fonts.titleSemi, color: colors.primary },
});
