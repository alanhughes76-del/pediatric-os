/**
 * Resumen clínico (antecedentes), prompt maestro 7.5: perinatales, patológicos e internaciones,
 * familiares relevantes, hábitos y medicación actual. Uno por paciente; se guarda solo.
 * La familia no lo ve en el portal.
 */
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import type { ClinicalBackground, Patient } from '@/data/types';
import { textoEG } from '@/lib/edad';
import { ahoraISO } from '@/lib/fechas';
import { useAutoguardado } from '@/lib/useAutoguardado';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Campo, Opciones, EstadoGuardado } from '../Formulario';
import { TextoChico, TextoFuerte } from '../Texto';

type Campos = Pick<ClinicalBackground, 'deliveryType' | 'perinatalNotes' | 'pathological' | 'family' | 'habits' | 'currentMedication'> & { peso: string };

const PARTOS: { valor: NonNullable<ClinicalBackground['deliveryType']>; texto: string }[] = [
  { valor: 'vaginal', texto: 'Vaginal' },
  { valor: 'cesarea', texto: 'Cesárea' },
  { valor: 'no-sabe', texto: 'No se sabe' },
];

const desde = (a?: ClinicalBackground): Campos => ({
  peso: a?.birthWeightG ? String(a.birthWeightG) : '',
  deliveryType: a?.deliveryType,
  perinatalNotes: a?.perinatalNotes ?? '',
  pathological: a?.pathological ?? '',
  family: a?.family ?? '',
  habits: a?.habits ?? '',
  currentMedication: a?.currentMedication ?? '',
});

export const idAntecedentes = (patientId: string) => `ant-${patientId}`;

export function BloqueAntecedentes({ paciente: p }: { paciente: Patient }) {
  const { db, agregar, actualizar } = useApp();
  const actual = db.backgrounds.find((b) => b.patientId === p.id && !b.archivedAt);
  const [v, setV] = useState<Campos>(() => desde(actual));
  // En Firebase los datos pueden llegar después de abrir la ficha: mientras no se haya tocado
  // nada, se toman los que llegan.
  const tocado = useRef(false);
  useEffect(() => {
    if (!tocado.current && actual) setV(desde(actual));
  }, [actual]);
  const pesoInvalido = v.peso !== '' && !(Number(v.peso) >= 300 && Number(v.peso) <= 7000);

  const pendiente = useAutoguardado(v, (x) => {
    if (x.peso !== '' && !(Number(x.peso) >= 300 && Number(x.peso) <= 7000)) return;
    const { peso, ...resto } = x;
    const datos = { ...resto, birthWeightG: peso ? Number(peso) : undefined, updatedAt: ahoraISO() };
    const existente = db.backgrounds.find((b) => b.patientId === p.id && !b.archivedAt);
    // Sin cambios reales (por ejemplo, cuando llegan los datos de la base), no se escribe nada.
    if (JSON.stringify(desde(existente)) === JSON.stringify(x)) return;
    if (existente) actualizar('backgrounds', existente.id, datos, 'antecedentes.editar');
    else agregar('backgrounds', { id: idAntecedentes(p.id), patientId: p.id, ...datos }, 'antecedentes.crear');
  });
  const poner = <K extends keyof Campos>(k: K) => (valor: Campos[K]) => {
    tocado.current = true;
    setV((x) => ({ ...x, [k]: valor }));
  };

  return (
    <Seccion titulo="Antecedentes" bajada="Solo los ves vos. Se guardan solos." accion={<EstadoGuardado pendiente={pendiente} />}>
      <Tarjeta style={{ gap: 14 }}>
        <TextoFuerte>Perinatales</TextoFuerte>
        <TextoChico>Edad gestacional al nacer: {textoEG(p)} (se cambia en Datos y familia).</TextoChico>
        <View style={s.fila}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Campo
              etiqueta="Peso al nacer (g)"
              value={v.peso}
              onChangeText={(t) => poner('peso')(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="3250"
              error={pesoInvalido ? 'Revisá el peso: entre 300 y 7000 g.' : undefined}
            />
          </View>
        </View>
        <Opciones etiqueta="Tipo de parto" opciones={PARTOS} valor={v.deliveryType} onCambio={poner('deliveryType')} />
        <Campo etiqueta="Complicaciones perinatales" value={v.perinatalNotes} onChangeText={poner('perinatalNotes')} multiline />
        <Campo etiqueta="Patológicos e internaciones" value={v.pathological} onChangeText={poner('pathological')} multiline />
        <Campo etiqueta="Familiares relevantes" value={v.family} onChangeText={poner('family')} multiline />
        <Campo etiqueta="Hábitos" value={v.habits} onChangeText={poner('habits')} multiline placeholder="Sueño, alimentación, pantallas, escolaridad…" />
        <Campo etiqueta="Medicación actual" value={v.currentMedication} onChangeText={poner('currentMedication')} multiline />
      </Tarjeta>
    </Seccion>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
