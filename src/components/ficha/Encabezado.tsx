/**
 * Encabezado de la ficha (tarjeta con iniciales, nombre, edades, última medición, DNI y etiquetas)
 * y bloque "Datos del paciente" (DNI y ámbito editables; el ámbito se guarda al cambiarlo).
 */
import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { alergiasDe, medicionesDe, nombreCompleto } from '@/data/selectores';
import type { Patient, Scope } from '@/data/types';
import { edades, textoEG } from '@/lib/edad';
import { fechaCorta } from '@/lib/fechas';
import { TEXTO_AMBITO } from '@/lib/busqueda';
import { Titulo, Texto, TextoFuerte, TextoChico } from '../Texto';
import { Opciones } from '../Formulario';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Seccion } from '../Seccion';
import { CampoEditable } from './piezas';
import { categorias, colors, fonts, size } from '@/theme';

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
  const iniciales = `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();

  return (
    <Tarjeta style={s.tarjeta}>
      <View style={s.arriba}>
        <View style={s.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={s.avatarTexto}>{iniciales}</Text>
        </View>
        <View style={s.datos}>
          <Titulo>{nombreCompleto(p)}</Titulo>
          <View style={s.cifras}>
            <Cifra texto={e.cronologica} fuerte />
            {peso?.weightKg != null ? <Cifra texto={`${coma(peso.weightKg)} kg`} /> : null}
            {talla?.heightCm != null ? <Cifra texto={`${coma(talla.heightCm)} cm`} /> : null}
            {p.dni ? <Cifra texto={`DNI ${p.dni}`} /> : null}
          </View>
          <TextoChico>
            Nació el {fechaCorta(p.birthDate)} · {textoEG(p)} · Sexo {SEXO[p.sex]}
            {peso || talla ? ` · Última medición ${fechaCorta((peso ?? talla)!.measuredAt)}` : ''}
          </TextoChico>
        </View>
        {acciones ? <View style={s.acciones}>{acciones}</View> : null}
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
        <Etiqueta texto={TEXTO_AMBITO[p.scope]} tono="celeste" />
        {confirmadas.map((a) => <Etiqueta key={a.id} texto={`Alergia: ${a.allergen}`} tono="alerta" />)}
        {referidas.map((a) => <Etiqueta key={a.id} texto={`Alergia referida: ${a.allergen}`} tono="arena" />)}
        {alergias.length === 0 ? <Etiqueta texto="Sin alergias cargadas" tono="verdeAgua" /> : null}
      </View>
    </Tarjeta>
  );
}

function Cifra({ texto, fuerte }: { texto: string; fuerte?: boolean }) {
  return <Text style={[s.cifra, fuerte && { color: colors.primary2, fontFamily: fonts.bodyBold }]}>{texto}</Text>;
}

export function BloqueDatos({ paciente: p }: { paciente: Patient }) {
  const { actualizar } = useApp();
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
      </Tarjeta>
    </Seccion>
  );
}

const s = StyleSheet.create({
  tarjeta: { gap: 14, padding: 22 },
  arriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: categorias.celeste.fondo, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fonts.title, fontSize: 28, color: categorias.celeste.texto },
  datos: { flex: 1, minWidth: 220, gap: 6 },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 18, rowGap: 4 },
  cifra: { fontFamily: fonts.bodySemi, fontSize: size.large, color: colors.text },
  acciones: { gap: 10, minWidth: 240, maxWidth: 320, flexGrow: 1 },
  corregida: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
