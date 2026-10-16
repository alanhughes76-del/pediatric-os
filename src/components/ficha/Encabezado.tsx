/** Encabezado de la ficha: nombre, edades, ámbito (se guarda al cambiarlo) y alergias confirmadas. */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { alergiasDe, nombreCompleto } from '@/data/selectores';
import type { Patient, Scope } from '@/data/types';
import { edades, textoEG } from '@/lib/edad';
import { fechaCorta } from '@/lib/fechas';
import { TEXTO_AMBITO } from '@/lib/busqueda';
import { Titulo, Texto, TextoFuerte, TextoChico } from '../Texto';
import { Opciones } from '../Formulario';
import { AlergiasDestacadas } from '../Alergias';
import { colors, fonts, size } from '@/theme';

const SEXO = { M: 'Masculino', F: 'Femenino', X: 'X' } as const;

export function Encabezado({ paciente: p }: { paciente: Patient }) {
  const { db, actualizar } = useApp();
  const e = edades(p, undefined, 'abreviado');
  const confirmadas = alergiasDe(db, p.id, 'medico').filter((a) => a.status === 'confirmada');

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Titulo>{nombreCompleto(p)}</Titulo>
        <Texto style={s.edad}>{e.cronologica}</Texto>
        {e.corregida ? (
          <View style={s.corregida}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Texto style={{ flex: 1 }}>
              <TextoFuerte color={colors.primary}>Edad corregida: </TextoFuerte>
              {e.corregida}
            </Texto>
          </View>
        ) : null}
        <TextoChico>
          Edad gestacional al nacer: {textoEG(p)} · Nació el {fechaCorta(p.birthDate)} · Sexo {SEXO[p.sex]}
        </TextoChico>
      </View>

      <Opciones<Scope>
        etiqueta="Ámbito"
        opciones={(Object.keys(TEXTO_AMBITO) as Scope[]).map((v) => ({ valor: v, texto: TEXTO_AMBITO[v] }))}
        valor={p.scope}
        onCambio={(v) => v !== p.scope && actualizar('patients', p.id, { scope: v }, 'paciente.ambito')}
      />

      {confirmadas.length > 0 ? <AlergiasDestacadas alergias={confirmadas} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  edad: { fontFamily: fonts.bodySemi, fontSize: size.large, color: colors.primary2 },
  corregida: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
});
