/**
 * Lista de pacientes: solapas por ámbito con su cantidad, orden alfabético por apellido
 * y buscador (sin distinguir mayúsculas ni tildes) dentro de la solapa activa.
 */
import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { fiebreDe, sinRevisar } from '@/data/selectores';
import { SOLAPAS, contarPorSolapa, filtrarPacientes, type Solapa } from '@/lib/busqueda';
import { edades } from '@/lib/edad';
import { fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Campo } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Avatar, TONO_AMBITO } from '@/components/Avatar';
import { useEscritorio } from '@/components/escritorio/Marco';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { colors, fonts } from '@/theme';

export default function Pacientes() {
  const { db } = useApp();
  const escritorio = useEscritorio();
  // `q` llega desde el buscador de la barra superior (pantallas anchas).
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [solapa, setSolapa] = useState<Solapa>('todos');
  const [busqueda, setBusqueda] = useState(q ?? '');
  const [qPrevio, setQPrevio] = useState(q);
  if (q !== qPrevio) {
    setQPrevio(q);
    setBusqueda(q ?? '');
    setSolapa('todos');
  }

  const conteo = useMemo(() => contarPorSolapa(db.patients), [db.patients]);
  const lista = useMemo(() => filtrarPacientes(db.patients, solapa, busqueda), [db.patients, solapa, busqueda]);

  return (
    <Pantalla ancho>
      <View style={s.arriba}>
        <View style={s.buscador}>
          <Campo
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Nombre, iniciales o dd/mm/aaaa"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Buscar paciente"
          />
        </View>
        <View style={s.nuevo}>
          <Boton titulo="+ Nuevo paciente" onPress={() => router.push('/medico/paciente/nuevo')} />
        </View>
      </View>

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
              <Text style={[s.solapaTexto, activa && { color: colors.white }]}>{x.clave === 'todos' ? x.texto : db.ambitos[x.clave]}</Text>
              <Text style={[s.solapaNumero, activa && { color: colors.bgSoft }]}>{conteo[x.clave]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <TextoChico>
        {busqueda.trim() ? `${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}` : `${lista.length} ${lista.length === 1 ? 'paciente' : 'pacientes'}`}
      </TextoChico>

      {lista.length === 0 ? (
        <Texto color={colors.textMuted}>No encontramos pacientes{busqueda.trim() ? ` con «${busqueda.trim()}»` : ''} en esta solapa.</Texto>
      ) : null}

      <View style={s.grilla}>
        {lista.map((p) => {
          const fiebre = fiebreDe(db, p.id).filter(sinRevisar).length;
          return (
            <Tarjeta key={p.id} onPress={() => router.push(`/medico/hijo/${p.id}`)} accessibilityLabel={`Abrir la ficha de ${p.firstName} ${p.lastName}`} style={[s.fila, escritorio && s.media]}>
              <Avatar paciente={p} />
              <View style={{ flex: 1, gap: 2 }}>
                <TextoFuerte style={{ fontSize: 19 }}>{p.lastName}, {p.firstName}</TextoFuerte>
                <TextoChico>{edades(p, undefined, 'abreviado').cronologica} · {fechaCorta(p.birthDate)}</TextoChico>
                {solapa === 'todos' || fiebre > 0 ? (
                  <View style={s.etiquetas}>
                    {solapa === 'todos' ? <Etiqueta texto={db.ambitos[p.scope]} tono={TONO_AMBITO[p.scope]} /> : null}
                    {fiebre > 0 ? <Etiqueta texto={`${fiebre} de fiebre sin revisar`} tono="azul" /> : null}
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.primary3} />
            </Tarjeta>
          );
        })}
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  solapas: { gap: 8, paddingVertical: 2 },
  solapa: {
    minHeight: 48, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary3,
    backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  solapaActiva: { backgroundColor: colors.accion, borderColor: colors.accion },
  solapaTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary },
  solapaNumero: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  arriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  buscador: { flexGrow: 1, flexBasis: 280 },
  nuevo: { flexGrow: 1, flexBasis: 220, maxWidth: 360 },
  // En pantalla ancha, dos columnas fijas (la última tarjeta no se estira); en el teléfono, una.
  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  fila: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  media: { width: '49.2%' },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
});
