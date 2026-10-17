/**
 * Ficha completa del paciente, del lado del médico, como tablero (prompt maestro 5.2):
 * encabezado y pestañas Resumen · Historia clínica · Consultas · Crecimiento · Vacunas ·
 * Medicaciones · Estudios · Documentos · Comunicaciones · Plan de cuidado, más "Datos y familia"
 * y "Fiebre" (pedido del Dr. en la Etapa 0). Las pestañas de módulos que todavía no existen
 * dicen en qué etapa llegan.
 * (El portal de la familia usa su propia vista: components/FichaHijo.tsx.)
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente as buscarPaciente } from '@/data/selectores';
import { Texto } from '../Texto';
import { Boton } from '../Boton';
import { BotonTexto } from './piezas';
import { Encabezado, BloqueDatos } from './Encabezado';
import { BloqueAdultos, BloqueContacto } from './Adultos';
import { BloqueAlergias, BloquePlan, BloqueProblemas, BloqueVacunas } from './Clinica';
import { EstadoVacio } from '../Estados';
import { BloqueConsultas, BloqueCrecimiento, BloqueDocumentos, BloqueFiebre, useNuevaConsulta } from './Historia';
import { Resumen } from './Resumen';
import { BloqueAntecedentes } from './Antecedentes';
import { colors, fonts } from '@/theme';

export type SolapaFicha =
  | 'resumen' | 'historia' | 'consultas' | 'crecimiento' | 'vacunas' | 'medicaciones' | 'estudios'
  | 'documentos' | 'comunicaciones' | 'plan' | 'datos' | 'fiebre';

const SOLAPAS: { clave: SolapaFicha; texto: string }[] = [
  { clave: 'resumen', texto: 'Resumen' },
  { clave: 'historia', texto: 'Historia clínica' },
  { clave: 'consultas', texto: 'Consultas' },
  { clave: 'crecimiento', texto: 'Crecimiento' },
  { clave: 'vacunas', texto: 'Vacunas' },
  { clave: 'medicaciones', texto: 'Medicaciones' },
  { clave: 'estudios', texto: 'Estudios' },
  { clave: 'documentos', texto: 'Documentos' },
  { clave: 'comunicaciones', texto: 'Comunicaciones' },
  { clave: 'plan', texto: 'Plan de cuidado' },
  { clave: 'datos', texto: 'Datos y familia' },
  { clave: 'fiebre', texto: 'Fiebre' },
];

export function FichaPaciente({ patientId, solapaInicial }: { patientId: string; solapaInicial?: SolapaFicha }) {
  const { db } = useApp();
  const [solapa, setSolapa] = useState<SolapaFicha>(solapaInicial && SOLAPAS.some((x) => x.clave === solapaInicial) ? solapaInicial : 'resumen');
  const [rapidas, setRapidas] = useState(false);
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
            <Boton titulo="Acciones rápidas" icono={rapidas ? 'chevron-up' : 'chevron-down'} variante="contorno" compacto onPress={() => setRapidas((x) => !x)} />
            {rapidas ? (
              <View style={s.rapidas}>
                <BotonTexto texto="Emitir certificado" onPress={() => router.push({ pathname: '/medico/certificado/nuevo', params: { paciente: p.id } })} />
                <BotonTexto texto="Registrar fiebre a mano" onPress={() => router.push({ pathname: '/medico/fiebre/nuevo', params: { paciente: p.id, tipo: 'toma' } })} />
                <BotonTexto texto="Editar datos y familia" onPress={() => { setSolapa('datos'); setRapidas(false); }} />
                {p.familyId ? <BotonTexto texto="Ver la familia" onPress={() => router.push(`/medico/familia/${p.familyId}`)} /> : null}
              </View>
            ) : null}
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
          <BloqueAntecedentes key={p.id} paciente={p} />
          <BloqueProblemas patientId={p.id} />
          <BloqueAlergias patientId={p.id} />
        </>
      ) : null}
      {solapa === 'consultas' ? <BloqueConsultas patientId={p.id} /> : null}
      {solapa === 'crecimiento' ? <BloqueCrecimiento paciente={p} /> : null}
      {solapa === 'plan' ? <BloquePlan patientId={p.id} /> : null}
      {solapa === 'vacunas' ? <BloqueVacunas patientId={p.id} /> : null}
      {solapa === 'medicaciones' ? <EstadoVacio icono="reader-outline" titulo="Medicaciones llega en la Etapa 5" texto="Medicación actual y registro de lo indicado en cada consulta. La plataforma nunca sugiere ni calcula dosis." /> : null}
      {solapa === 'estudios' ? <EstadoVacio icono="flask-outline" titulo="Estudios llega en la Etapa 5" texto="Pedidos, resultados y la fecha en que querés revisarlos." /> : null}
      {solapa === 'comunicaciones' ? <EstadoVacio icono="chatbubbles-outline" titulo="Comunicaciones llega en la Etapa 7" texto="Registro de recordatorios, resúmenes y avisos. Las conversaciones siguen por PacienteX." /> : null}
      {solapa === 'fiebre' ? <BloqueFiebre patientId={p.id} /> : null}
      {solapa === 'documentos' ? <BloqueDocumentos patientId={p.id} /> : null}
    </>
  );
}

const s = StyleSheet.create({
  rapidas: { backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  barra: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8 },
  solapas: { gap: 4 },
  solapa: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  solapaActiva: { borderBottomColor: colors.primary2 },
  solapaTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textMuted },
  solapaTextoActiva: { color: colors.primary },
});
