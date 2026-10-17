/**
 * Familias (prompt maestro 7.3): lista con búsqueda por apellido, adulto, teléfono o hijo.
 */
import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { membresiaDeFamilia } from '@/data/selectores';
import { filtrarFamilias } from '@/lib/busquedaFamilias';
import { Pantalla } from '@/components/Pantalla';
import { Campo } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { EstadoVacio } from '@/components/Estados';
import { TextoFuerte, TextoChico } from '@/components/Texto';
import { useEscritorio } from '@/components/escritorio/Marco';
import { colors } from '@/theme';

export default function Familias() {
  const { db } = useApp();
  const escritorio = useEscritorio();
  const [busqueda, setBusqueda] = useState('');
  const lista = useMemo(() => filtrarFamilias(db, busqueda), [db, busqueda]);

  return (
    <Pantalla ancho>
      <View style={s.arriba}>
        <View style={s.buscador}>
          <Campo value={busqueda} onChangeText={setBusqueda} placeholder="Apellido, adulto, teléfono o hijo" autoCorrect={false} accessibilityLabel="Buscar familia" />
        </View>
        <View style={s.nueva}><Boton titulo="+ Nueva familia" onPress={() => router.push('/medico/familias/nueva')} /></View>
      </View>
      <TextoChico>{lista.length} {lista.length === 1 ? 'familia' : 'familias'}</TextoChico>
      {lista.length === 0 ? (
        <EstadoVacio icono="search-outline" titulo="No encontramos familias" texto={busqueda.trim() ? `Nada coincide con «${busqueda.trim()}».` : 'Todavía no hay familias cargadas.'} />
      ) : null}
      <View style={s.grilla}>
        {lista.map((f) => {
          const hijos = db.patients.filter((p) => p.familyId === f.id && !p.archivedAt);
          const adultos = db.guardians.filter((g) => g.familyId === f.id && !g.archivedAt);
          const { estado } = membresiaDeFamilia(db, f.id);
          return (
            <Tarjeta key={f.id} onPress={() => router.push(`/medico/familia/${f.id}`)} accessibilityLabel={`Abrir la ${f.name}`} style={[s.fila, escritorio && s.media]}>
              <View style={{ flex: 1, gap: 4 }}>
                <TextoFuerte style={{ fontSize: 18 }}>{f.name}</TextoFuerte>
                <TextoChico>
                  {hijos.length === 0 ? 'Sin hijos cargados' : hijos.map((h) => h.firstName).join(', ')} · {adultos.length} {adultos.length === 1 ? 'adulto' : 'adultos'}
                </TextoChico>
                <View style={s.etiquetas}>
                  {f.zone ? <Etiqueta texto={f.zone} tono="celeste" /> : null}
                  {estado === 'activa' ? <Etiqueta texto="Membresía activa" tono="verde" /> : null}
                  {estado === 'por-vencer' ? <Etiqueta texto="Membresía por renovar" tono="naranja" /> : null}
                  {estado === 'vencida' ? <Etiqueta texto="Membresía vencida" tono="alerta" /> : null}
                  {f.status === 'inactiva' ? <Etiqueta texto="Inactiva" tono="neutro" /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.primary3} />
            </Tarjeta>
          );
        })}
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  arriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  buscador: { flexGrow: 1, flexBasis: 280 },
  nueva: { flexGrow: 1, flexBasis: 220, maxWidth: 360 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  fila: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  media: { width: '49.2%' },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
