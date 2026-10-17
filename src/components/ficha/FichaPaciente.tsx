/**
 * Ficha completa del paciente, del lado del médico, como tablero:
 * encabezado con los datos principales y solapas. "Resumen" junta lo más importante;
 * el resto de las solapas tiene los bloques completos (los mismos de antes, sin cambios).
 * (El portal de la familia usa su propia vista: components/FichaHijo.tsx.)
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente as buscarPaciente } from '@/data/selectores';
import { Texto } from '../Texto';
import { Boton } from '../Boton';
import { Encabezado, BloqueDatos } from './Encabezado';
import { BloqueAdultos, BloqueContacto } from './Adultos';
import { BloqueAlergias, BloquePlan, BloqueProblemas } from './Clinica';
import { BloqueConsultas, BloqueCrecimiento, BloqueDocumentos, BloqueFiebre, useNuevaConsulta } from './Historia';
import { Resumen } from './Resumen';
import { colors, fonts } from '@/theme';

export type SolapaFicha = 'resumen' | 'datos' | 'historia' | 'consultas' | 'crecimiento' | 'plan' | 'fiebre' | 'documentos';

const SOLAPAS: { clave: SolapaFicha; texto: string }[] = [
  { clave: 'resumen', texto: 'Resumen' },
  { clave: 'datos', texto: 'Datos y familia' },
  { clave: 'historia', texto: 'Historia clínica' },
  { clave: 'consultas', texto: 'Consultas' },
  { clave: 'crecimiento', texto: 'Crecimiento' },
  { clave: 'plan', texto: 'Plan y vacunas' },
  { clave: 'fiebre', texto: 'Fiebre' },
  { clave: 'documentos', texto: 'Documentos' },
];

export function FichaPaciente({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const [solapa, setSolapa] = useState<SolapaFicha>('resumen');
  const nuevaConsulta = useNuevaConsulta(patientId);
  const p = buscarPaciente(db, patientId);
  if (!p) return <Texto>No encontramos esta ficha.</Texto>;

  return (
    <>
      <Encabezado
        paciente={p}
        acciones={
          <>
            <Boton titulo="Nueva consulta" icono="add" compacto onPress={nuevaConsulta} />
            <Boton
              titulo="Emitir certificado"
              icono="document-text-outline"
              variante="secundario"
              compacto
              onPress={() => router.push({ pathname: '/medico/certificado/nuevo', params: { paciente: p.id } })}
            />
          </>
        }
      />

      <View style={s.barra}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.solapas} accessibilityRole="tablist">
          {SOLAPAS.map((x) => {
            const activa = x.clave === solapa;
            return (
              <Pressable
                key={x.clave}
                onPress={() => setSolapa(x.clave)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                style={[s.solapa, activa && s.solapaActiva]}
              >
                <Text style={[s.solapaTexto, activa && s.solapaTextoActiva]}>{x.texto}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {solapa === 'resumen' ? <Resumen paciente={p} irA={setSolapa} /> : null}
      {solapa === 'datos' ? (
        <>
          <BloqueDatos paciente={p} />
          <BloqueContacto patientId={p.id} />
          <BloqueAdultos patientId={p.id} />
        </>
      ) : null}
      {solapa === 'historia' ? (
        <>
          <BloqueProblemas patientId={p.id} />
          <BloqueAlergias patientId={p.id} />
        </>
      ) : null}
      {solapa === 'consultas' ? <BloqueConsultas patientId={p.id} /> : null}
      {solapa === 'crecimiento' ? <BloqueCrecimiento paciente={p} /> : null}
      {solapa === 'plan' ? <BloquePlan patientId={p.id} /> : null}
      {solapa === 'fiebre' ? <BloqueFiebre patientId={p.id} /> : null}
      {solapa === 'documentos' ? <BloqueDocumentos patientId={p.id} /> : null}
    </>
  );
}

const s = StyleSheet.create({
  barra: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8 },
  solapas: { gap: 4 },
  solapa: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  solapaActiva: { borderBottomColor: colors.primary2 },
  solapaTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textMuted },
  solapaTextoActiva: { color: colors.primary },
});
