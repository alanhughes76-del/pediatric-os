/**
 * Ficha completa del paciente, del lado del médico, como tablero (prompt maestro 5.2):
 * encabezado y pestañas Resumen · Historia clínica · Consultas · Crecimiento · Vacunas ·
 * Medicaciones · Estudios · Documentos · Comunicaciones · Plan de cuidado, más "Datos y familia"
 * y "Fiebre" (pedido del Dr. en la Etapa 0). Las pestañas de módulos que todavía no existen
 * dicen en qué etapa llegan.
 * (El portal de la familia usa su propia vista: components/FichaHijo.tsx.)
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Text, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente as buscarPaciente } from '@/data/selectores';
import { Texto, TextoFuerte } from '../Texto';
import { Seccion } from '../Seccion';
import { PanelIA } from '../ia/PanelIA';
import { ComunicacionesPaciente } from './ComunicacionesPaciente';
import { Boton } from '../Boton';
import { BotonTexto } from './piezas';
import { Encabezado, BloqueDatos } from './Encabezado';
import { BloqueAdultos, BloqueContacto } from './Adultos';
import { BloqueAlergias, BloquePlan, BloqueProblemas } from './Clinica';
import { BloqueVacunas } from './Vacunas';
import { BloqueMedicacion, BloquePrescripciones } from './Medicacion';
import { BloqueEstudios } from './Estudios';
import { BloqueConsultas, BloqueCrecimiento, BloqueFiebre, useNuevaConsulta } from './Historia';
import { BloqueDocumentos } from './Documentos';
import { BloqueMaterial } from './MaterialFamilia';
import { Resumen } from './Resumen';
import { BloqueAntecedentes } from './Antecedentes';
import { categorias, colors, fonts } from '@/theme';

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
      {solapa === 'plan' ? (
        <>
          <BloquePlan patientId={p.id} />
          <BloqueMaterial paciente={p} />
        </>
      ) : null}
      {solapa === 'vacunas' ? <BloqueVacunas paciente={p} /> : null}
      {solapa === 'medicaciones' ? (
        <>
          <BloqueMedicacion paciente={p} />
          <BloquePrescripciones paciente={p} />
        </>
      ) : null}
      {solapa === 'estudios' ? <BloqueEstudios paciente={p} /> : null}
      {solapa === 'comunicaciones' ? (
        <Seccion titulo="Comunicaciones" bajada="Registro de recordatorios, resúmenes y avisos. Las conversaciones siguen por PacienteX.">
          <ComunicacionesPaciente patientId={p.id} />
        </Seccion>
      ) : null}
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
  flotante: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: categorias.violeta.acento, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(30, 58, 82, 0.25)' },
  fondo: { flex: 1, backgroundColor: 'rgba(30, 58, 82, 0.35)' },
  hoja: { maxHeight: '80%', backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
});

/**
 * Botón flotante de la IA (celular, prompt maestro 5.3): abre el panel en una hoja inferior.
 * Va fuera del contenido que se desplaza (el pie de la pantalla), para quedar fijo.
 */
export function BotonIA({ patientId }: { patientId: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <Pressable onPress={() => setAbierta(true)} accessibilityRole="button" accessibilityLabel="Abrir la IA Asistente" style={s.flotante}>
        <Ionicons name="sparkles" size={26} color={colors.white} />
      </Pressable>
      <Modal visible={abierta} transparent animationType="slide" onRequestClose={() => setAbierta(false)}>
        <Pressable style={s.fondo} onPress={() => setAbierta(false)} accessibilityLabel="Cerrar" />
        <View style={s.hoja}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles-outline" size={22} color={categorias.violeta.acento} />
            <TextoFuerte style={{ flex: 1 }}>IA Asistente</TextoFuerte>
            <Pressable onPress={() => setAbierta(false)} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}><PanelIA patientId={patientId} /></ScrollView>
        </View>
      </Modal>
    </>
  );
}
