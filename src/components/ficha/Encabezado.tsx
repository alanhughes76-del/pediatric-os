/**
 * Encabezado de la ficha (prompt maestro 5.2): iniciales, nombre, edad, peso y talla de la última
 * medición, grupo sanguíneo, nacimiento y DNI; etiquetas de familia, cobertura, alergias y ámbito
 * (tipo de seguimiento); tarjeta "Próximo turno" y acciones. Blanco, con un aura del color del ámbito.
 * Y el bloque "Datos del paciente": DNI, ámbito (se guarda al cambiarlo), cobertura, grupo
 * sanguíneo y familia, editables.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { alergiasDe, medicionesDe, nombreCompleto, proximoTurno, textoCobertura, TEXTO_COBERTURA } from '@/data/selectores';
import { TEXTO_TIPO_TURNO, TEXTO_ESTADO_TURNO } from '@shared/agenda';
import { GRUPOS_SANGUINEOS, type BloodType, type CoverageKind, type Patient, type Scope } from '@/data/types';
import { edades, textoEG } from '@/lib/edad';
import { cuandoEs, fechaCorta, hora } from '@/lib/fechas';
import { Antetitulo, Titulo, Texto, TextoFuerte, TextoChico } from '../Texto';
import { Opciones } from '../Formulario';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Seccion } from '../Seccion';
import { BotonTexto, CampoEditable } from './piezas';
import { Avatar, TONO_AMBITO } from '../Avatar';
import { categorias, colors, size } from '@/theme';

const SEXO = { M: 'Masculino', F: 'Femenino', X: 'X' } as const;

const coma = (n: number) => String(n).replace('.', ',');

export function Encabezado({ paciente: p, acciones }: { paciente: Patient; acciones?: ReactNode }) {
  const { db } = useApp();
  const e = edades(p, undefined, 'abreviado');
  const alergias = alergiasDe(db, p.id, 'medico');
  const confirmadas = alergias.filter((a) => a.status === 'confirmada');
  const referidas = alergias.filter((a) => a.status === 'referida');
  const mediciones = medicionesDe(db, p.id);
  const peso = [...mediciones].reverse().find((m) => m.weightKg != null);
  const talla = [...mediciones].reverse().find((m) => m.heightCm != null);
  const familia = db.families.find((f) => f.id === p.familyId);
  const cobertura = textoCobertura(p.coverage);
  const turno = proximoTurno(db, [p.id]);
  // Como en Lovable: la tarjeta lleva el color del ámbito del paciente.
  const tono = categorias[TONO_AMBITO[p.scope]];

  return (
    <Tarjeta style={s.tarjeta}>
      {/* Aura del color del ámbito; recortada acá para no cortar la sombra de la tarjeta. */}
      <View style={s.aura} pointerEvents="none" aria-hidden>
        <View style={[s.mancha, { backgroundColor: tono.fondo }]} />
      </View>

      <View style={s.arriba}>
        <View style={s.datos}>
          <View style={s.identidad}>
            <Avatar paciente={p} tamano={72} />
            <View style={{ flex: 1, gap: 2 }}>
              <Antetitulo color={tono.texto}>Ficha pediátrica</Antetitulo>
              <Titulo>{nombreCompleto(p)}</Titulo>
            </View>
          </View>
          <Dato icono="gift-outline">
            <TextoFuerte style={{ fontSize: 16 }}>{e.cronologica}</TextoFuerte> · Nació el {fechaCorta(p.birthDate)} · {textoEG(p)} · Sexo {SEXO[p.sex]}
          </Dato>
          {peso || talla ? (
            <Dato icono="resize-outline">
              {peso?.weightKg != null ? <>Peso: <TextoFuerte style={{ fontSize: 16 }}>{coma(peso.weightKg)} kg</TextoFuerte></> : null}
              {peso && talla ? ' · ' : ''}
              {talla?.heightCm != null ? <>Talla: <TextoFuerte style={{ fontSize: 16 }}>{coma(talla.heightCm)} cm</TextoFuerte></> : null}
              {` · ${fechaCorta((peso ?? talla)!.measuredAt)}`}
            </Dato>
          ) : null}
          {p.dni || p.bloodType ? (
            <Dato icono="card-outline">
              {[p.dni && `DNI ${p.dni}`, p.bloodType && `Grupo ${p.bloodType}`].filter(Boolean).join(' · ')}
            </Dato>
          ) : null}
          {e.corregida ? (
            <View style={s.corregida}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Texto style={{ flex: 1 }}>
                <TextoFuerte color={colors.primary}>Edad corregida: </TextoFuerte>
                {e.corregida}
              </Texto>
            </View>
          ) : null}
          <View style={s.etiquetas}>
            {familia ? <Etiqueta texto={familia.name} tono="neutro" /> : null}
            {cobertura ? <Etiqueta texto={cobertura} tono="celeste" /> : null}
            {confirmadas.map((a) => <Etiqueta key={a.id} texto={`Alergia: ${a.allergen}`} tono="alerta" />)}
            {referidas.map((a) => <Etiqueta key={a.id} texto={`Alergia referida: ${a.allergen}`} tono="naranja" />)}
            {alergias.length === 0 ? <Etiqueta texto="Sin alergias cargadas" tono="verde" /> : null}
            <Etiqueta texto={db.ambitos[p.scope]} tono={TONO_AMBITO[p.scope]} />
          </View>
        </View>
        <View style={s.turno}>
          <Antetitulo>Próximo turno</Antetitulo>
          {turno ? (
            <>
              <TextoFuerte>{cuandoEs(turno.start)}, {hora(turno.start)} h</TextoFuerte>
              <TextoChico>{TEXTO_TIPO_TURNO[turno.type]} · {TEXTO_ESTADO_TURNO[turno.status]}</TextoChico>
            </>
          ) : <Texto color={colors.textMuted}>Sin turnos programados</Texto>}
          {turno
            ? <BotonTexto texto="Ver turno" onPress={() => router.push(`/medico/turno/${turno.id}`)} />
            : <BotonTexto texto="Dar turno" onPress={() => router.push({ pathname: '/medico/turno/nuevo', params: { paciente: p.id } })} />}
        </View>
      </View>

      {acciones ? <View style={s.acciones}>{acciones}</View> : null}
    </Tarjeta>
  );
}

function Dato({ icono, children }: { icono: keyof typeof Ionicons.glyphMap; children: ReactNode }) {
  return (
    <View style={s.dato}>
      <Ionicons name={icono} size={18} color={colors.primary2} style={{ marginTop: 2 }} />
      <Texto style={{ flex: 1, fontSize: 16 }}>{children}</Texto>
    </View>
  );
}

const COBERTURAS = (Object.keys(TEXTO_COBERTURA) as CoverageKind[]).map((v) => ({ valor: v, texto: TEXTO_COBERTURA[v] }));

export function BloqueDatos({ paciente: p }: { paciente: Patient }) {
  const { db, actualizar } = useApp();
  const familia = db.families.find((f) => f.id === p.familyId);
  return (
    <Seccion titulo="Datos del paciente">
      <Tarjeta style={{ gap: 14 }}>
        <CampoEditable
          etiqueta="DNI"
          valor={p.dni}
          keyboardType="number-pad"
          placeholder="Ej.: 55123456"
          onGuardar={(v) => actualizar('patients', p.id, { dni: v || undefined }, 'paciente.dni')}
        />
        <Opciones<Scope>
          etiqueta="Ámbito"
          opciones={(Object.keys(db.ambitos) as Scope[]).map((v) => ({ valor: v, texto: db.ambitos[v] }))}
          valor={p.scope}
          onCambio={(v) => v !== p.scope && actualizar('patients', p.id, { scope: v }, 'paciente.ambito')}
        />
        <Opciones<CoverageKind>
          etiqueta="Cobertura"
          opciones={COBERTURAS}
          valor={p.coverage?.kind}
          onCambio={(v) => actualizar('patients', p.id, { coverage: { ...p.coverage, kind: v } }, 'paciente.cobertura')}
        />
        {p.coverage && p.coverage.kind !== 'particular' ? (
          <>
            <CampoEditable etiqueta={p.coverage.kind === 'prepaga' ? 'Prepaga y plan' : 'Obra social'} valor={p.coverage.name}
              onGuardar={(v) => actualizar('patients', p.id, { coverage: { ...p.coverage!, name: v || undefined } }, 'paciente.cobertura')} />
            <CampoEditable etiqueta="Número de afiliado" valor={p.coverage.memberNumber}
              onGuardar={(v) => actualizar('patients', p.id, { coverage: { ...p.coverage!, memberNumber: v || undefined } }, 'paciente.cobertura')} />
          </>
        ) : null}
        <Opciones<BloodType>
          etiqueta="Grupo sanguíneo"
          opciones={GRUPOS_SANGUINEOS.map((g) => ({ valor: g, texto: g }))}
          valor={p.bloodType}
          onCambio={(v) => actualizar('patients', p.id, { bloodType: v }, 'paciente.grupo-sanguineo')}
        />
        <View style={s.familia}>
          <View style={{ flex: 1 }}>
            <TextoChico>Familia</TextoChico>
            <Texto>{familia?.name ?? 'Sin familia asignada'}</Texto>
          </View>
          {familia ? <BotonTexto texto="Ver familia" onPress={() => router.push(`/medico/familia/${familia.id}`)} /> : null}
        </View>
        <TextoChico>La foto del paciente (con consentimiento de la familia) todavía no se puede cargar.</TextoChico>
      </Tarjeta>
    </Seccion>
  );
}

const s = StyleSheet.create({
  tarjeta: { gap: 14, padding: 22 },
  aura: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', borderRadius: size.radiusGrande },
  mancha: { position: 'absolute', top: -96, right: -72, width: 280, height: 280, borderRadius: 140, opacity: 0.7 },
  arriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 },
  datos: { flexGrow: 1, flexBasis: 280, minWidth: 0, gap: 8 },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dato: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  turno: { gap: 2, minWidth: 240, flexGrow: 1, maxWidth: 320, backgroundColor: colors.muted, borderRadius: 20, padding: 14 },
  familia: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  corregida: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
