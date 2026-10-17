/**
 * Encabezado de la ficha (prompt maestro 5.2): iniciales, nombre, edad, peso y talla de la última
 * medición, grupo sanguíneo, nacimiento y DNI; etiquetas de familia, cobertura, alergias y ámbito
 * (tipo de seguimiento); acciones y tarjeta "Próximo turno".
 * Y el bloque "Datos del paciente": DNI, ámbito (se guarda al cambiarlo), cobertura, grupo
 * sanguíneo y familia, editables.
 */
import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { alergiasDe, medicionesDe, nombreCompleto, proximaVisita, textoCobertura, TEXTO_COBERTURA, TEXTO_VISITA } from '@/data/selectores';
import { GRUPOS_SANGUINEOS, type BloodType, type CoverageKind, type Patient, type Scope } from '@/data/types';
import { edades, textoEG } from '@/lib/edad';
import { cuandoEs, fechaCorta, hora } from '@/lib/fechas';
import { TEXTO_AMBITO } from '@/lib/busqueda';
import { Titulo, Texto, TextoFuerte, TextoChico } from '../Texto';
import { Opciones } from '../Formulario';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Seccion } from '../Seccion';
import { BotonTexto, CampoEditable } from './piezas';
import { Avatar, TONO_AMBITO } from '../Avatar';
import { colors, fonts, size } from '@/theme';

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
  const turno = proximaVisita(db, [p.id]);

  return (
    <Tarjeta style={s.tarjeta}>
      <View style={s.arriba}>
        <Avatar paciente={p} tamano={72} />
        <View style={s.datos}>
          <Titulo>{nombreCompleto(p)}</Titulo>
          <View style={s.cifras}>
            <Cifra texto={e.cronologica} fuerte />
            {peso?.weightKg != null ? <Cifra texto={`${coma(peso.weightKg)} kg`} /> : null}
            {talla?.heightCm != null ? <Cifra texto={`${coma(talla.heightCm)} cm`} /> : null}
            {p.bloodType ? <Cifra texto={p.bloodType} /> : null}
            {p.dni ? <Cifra texto={`DNI ${p.dni}`} /> : null}
          </View>
          <TextoChico>
            Nació el {fechaCorta(p.birthDate)} · {textoEG(p)} · Sexo {SEXO[p.sex]}
            {peso || talla ? ` · Última medición ${fechaCorta((peso ?? talla)!.measuredAt)}` : ''}
          </TextoChico>
        </View>
        {acciones ? <View style={s.acciones}>{acciones}</View> : null}
        <View style={s.turno}>
          <TextoChico style={{ fontFamily: fonts.bodySemi }}>Próximo turno</TextoChico>
          {turno ? (
            <>
              <TextoFuerte>{cuandoEs(turno.occurredAt)}, {hora(turno.occurredAt)} h</TextoFuerte>
              <TextoChico>{TEXTO_VISITA[turno.visitType]}</TextoChico>
            </>
          ) : <Texto color={colors.textMuted}>Sin turnos programados</Texto>}
          <BotonTexto texto="Ver agenda" onPress={() => router.navigate('/medico/agenda')} />
        </View>
      </View>

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
        <Etiqueta texto={TEXTO_AMBITO[p.scope]} tono={TONO_AMBITO[p.scope]} />
      </View>
    </Tarjeta>
  );
}

function Cifra({ texto, fuerte }: { texto: string; fuerte?: boolean }) {
  return <Text style={[s.cifra, fuerte && { color: colors.primary2, fontFamily: fonts.bodyBold }]}>{texto}</Text>;
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
          opciones={(Object.keys(TEXTO_AMBITO) as Scope[]).map((v) => ({ valor: v, texto: TEXTO_AMBITO[v] }))}
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
        <TextoChico>La foto (con consentimiento de la familia) llega con el almacenamiento de archivos.</TextoChico>
      </Tarjeta>
    </Seccion>
  );
}

const s = StyleSheet.create({
  tarjeta: { gap: 14, padding: 22 },
  arriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 },
  datos: { flex: 1, minWidth: 220, gap: 6 },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 18, rowGap: 4 },
  cifra: { fontFamily: fonts.bodySemi, fontSize: size.large, color: colors.text },
  acciones: { gap: 10, minWidth: 240, maxWidth: 320, flexGrow: 1 },
  turno: { gap: 2, minWidth: 240, flexGrow: 1, maxWidth: 320, backgroundColor: colors.bg, borderRadius: 12, padding: 12 },
  familia: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  corregida: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
