import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, useSesionFamilia } from '@/data/store';
import { pacientesDeAdulto, proximoTurno, membresiaDeFamilia, textoDireccionTurno } from '@/data/selectores';
import { TEXTO_TIPO_TURNO } from '@shared/agenda';
import { cuandoEs, hora, fechaCorta } from '@/lib/fechas';
import { edades } from '@/lib/edad';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { Antetitulo, Subtitulo, Texto, TextoChico, TextoFuerte } from '@/components/Texto';
import { FichaHijo } from '@/components/FichaHijo';
import { TarjetaNoche } from '@/components/TarjetaNoche';
import { TituloEditorial } from '@/components/TituloEditorial';
import { Papelito } from '@/components/Papelito';
import { SelectorSegmentado } from '@/components/SelectorSegmentado';
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
      <View style={{ gap: 8 }}>
        <Antetitulo>Pediatría integral a domicilio</Antetitulo>
        <Papelito texto="Cuidando a tu familia en casa" manuscrito />
        <Saludo texto={`Hola, ${guardian.firstName}. Qué lindo verte por acá.`} izquierda />
        <TituloEditorial texto="Un pediatra que conoce a tu familia" destacado="por su nombre." ondulada />
        {familia ? <TextoChico>{familia.name}</TextoChico> : null}
      </View>

      <View style={s.arriba}>
        <TarjetaNoche style={s.proxima}>
          <View style={s.chips}>
            <Chip texto="Próxima visita" />
            {proxima?.modality === 'domicilio' ? <Chip texto="En tu hogar" icono="home-outline" /> : null}
          </View>
          {proxima ? (
            <>
              <Subtitulo color={colors.white}>{cuandoEs(proxima.start)}</Subtitulo>
              <Texto color={colors.white}>{hora(proxima.start)} h{proxima.status === 'pendiente' ? ' · A confirmar' : ''}</Texto>
              <View style={s.detalle}>
                <Texto color={colors.white}>{TEXTO_TIPO_TURNO[proxima.type]} · {proxima.patientIds.map(nombreDe).filter(Boolean).join(' y ')}</Texto>
                <TextoChico color={colors.bgSoft}>{textoDireccionTurno(proxima)}</TextoChico>
              </View>
              {proxima.status !== 'pendiente' ? <Text style={s.firma}>Nos vemos pronto, Alan</Text> : null}
            </>
          ) : (
            <Texto color={colors.white}>No tenés visitas programadas.</Texto>
          )}
        </TarjetaNoche>

        <View style={s.costado}>
          {membership && estado !== 'cancelada' ? (
            estado === 'vencida' || estado === 'suspendida' ? (
              <View style={[s.pastel, s.bannerVencida]}>
                <Ionicons name="information-circle" size={24} color={colors.alert} />
                <Texto style={{ flex: 1 }}>
                  Membresía {estado}. Seguís teniendo acceso de lectura a toda la información de tus hijos.
                </Texto>
              </View>
            ) : (
              <View style={[s.pastel, { backgroundColor: categorias.celeste.fondo }]}>
                <Ionicons name="shield-checkmark-outline" size={24} color={categorias.celeste.acento} />
                <View style={{ flex: 1, gap: 2 }}>
                  <TextoFuerte color={categorias.celeste.texto}>Membresía activa</TextoFuerte>
                  <TextoChico color={categorias.celeste.texto}>Se renueva el {fechaCorta(membership.renewalDate)}</TextoChico>
                </View>
              </View>
            )
          ) : null}
          <View style={s.visita}>
            <Subtitulo color={categorias.verde.texto}>Pedí una visita médica</Subtitulo>
            <Texto color={categorias.verde.texto}>Coordiná una visita en tu casa, con calma.</Texto>
            <Boton titulo="Coordinar ahora" iconoFinal="arrow-forward" onPress={() => router.navigate('/familia/pedir')} />
          </View>
        </View>
      </View>

      {hijos.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Antetitulo>Tus hijos</Antetitulo>
          <SelectorSegmentado
            tono="claro"
            etiqueta="Elegí de quién ver la ficha"
            anchoMinimo={150}
            valor={elegido?.id}
            onCambio={setElegidoId}
            opciones={hijos.map((h) => ({ valor: h.id, texto: h.firstName, detalle: edades(h).cronologica, adorno: <Avatar paciente={h} tamano={36} /> }))}
          />
        </View>
      ) : null}

      {elegido ? <FichaHijo key={elegido.id} hijoId={elegido.id} /> : <Texto color={colors.textMuted}>Todavía no hay chicos vinculados.</Texto>}
    </Pantalla>
  );
}

function Chip({ texto, icono }: { texto: string; icono?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.chip}>
      {icono ? <Ionicons name={icono} size={14} color={colors.bgSoft} /> : null}
      <Text style={s.chipTexto}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  arriba: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  costado: { flexGrow: 1, flexBasis: 280, gap: 12 },
  pastel: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: size.radiusGrande, padding: 20 },
  bannerVencida: { backgroundColor: colors.alertBg, borderWidth: 1, borderColor: colors.alertBorder, alignItems: 'flex-start' },
  visita: { gap: 8, borderRadius: size.radiusGrande, padding: 20, backgroundColor: categorias.verde.fondo },
  proxima: { flexGrow: 2, flexBasis: 340 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.nocheSuave },
  chipTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.bgSoft },
  detalle: { gap: 2, marginTop: 6, padding: 14, borderRadius: 20, backgroundColor: colors.nocheSuave },
  firma: { fontFamily: fonts.hand, fontSize: 22, color: colors.sky, marginTop: 4 },
});
