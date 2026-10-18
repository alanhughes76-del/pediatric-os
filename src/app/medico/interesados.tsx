/**
 * Interesados (prompt maestro 8.1, `formulario.web` y `tally.admision`): quienes escribieron por la web o
 * completaron la admisión y todavía no son una familia cargada. Se pasan a familia cuando se suman.
 * El mensaje y las respuestas (pueden ser de salud) los ve solo el médico.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import type { Interesado } from '@/data/types';
import { telefonoLegible } from '@shared/telefono';
import { fechaHoraCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Opciones, Aviso } from '@/components/Formulario';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { colors } from '@/theme';

type Filtro = 'abiertos' | 'todos';
const ESTADO = { nuevo: 'Nuevo', contactado: 'Contactado', familia: 'Ya es familia', archivado: 'Archivado' } as const;

export default function Interesados() {
  const { db, sesion } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('abiertos');
  const lista = db.interesados
    .filter((i) => !i.archivedAt && (filtro === 'todos' || i.estado === 'nuevo' || i.estado === 'contactado'))
    .sort((a, b) => b.recibidoAt.localeCompare(a.recibidoAt));

  return (
    <Pantalla ancho>
      <Titulo>Interesados</Titulo>
      <TextoChico>Quienes escribieron por la web o completaron la admisión. Cuando se suman, pasalos a familia.</TextoChico>
      <Opciones<Filtro> valor={filtro} onCambio={setFiltro} opciones={[{ valor: 'abiertos', texto: 'Para atender' }, { valor: 'todos', texto: 'Todos' }]} />
      {lista.length === 0 ? <Texto color={colors.textMuted}>No hay interesados en esta lista.</Texto> : null}
      {lista.map((i) => <Fila key={i.id} i={i} esMedico={sesion?.rol === 'medico'} />)}
    </Pantalla>
  );
}

function Fila({ i, esMedico }: { i: Interesado; esMedico: boolean }) {
  const { db, operaciones } = useApp();
  const [error, setError] = useState<string | null>(null);
  const detalle = esMedico ? db.admisiones.find((a) => a.interesadoId === i.id) : undefined;
  const marcar = async (estado: Interesado['estado']) => setError(await operaciones.actualizarEntrada('interesados', i.id, { estado }));

  return (
    <Tarjeta style={{ gap: 8 }}>
      <View style={s.fila}>
        <TextoFuerte style={{ flex: 1 }}>{i.nombre || 'Sin nombre'}</TextoFuerte>
        <Etiqueta texto={ESTADO[i.estado]} tono={i.estado === 'nuevo' ? 'naranja' : i.estado === 'familia' ? 'verde' : 'neutro'} />
      </View>
      <TextoChico>
        {[i.origen === 'web' ? 'Web' : 'Admisión (Tally)', fechaHoraCorta(i.recibidoAt), i.zona].filter(Boolean).join(' · ')}
      </TextoChico>
      <Texto>{[i.email, i.telefono ? telefonoLegible(i.telefono) : null].filter(Boolean).join(' · ')}</Texto>
      {detalle?.mensaje ? <Texto color={colors.textMuted}>«{detalle.mensaje}»</Texto> : null}
      {detalle?.respuestas.map((r, n) => <TextoChico key={n}>{r.pregunta}: {r.respuesta}</TextoChico>)}
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      {i.estado === 'familia' && i.familyId ? (
        <Boton titulo="Abrir la familia" variante="secundario" compacto onPress={() => router.push(`/medico/familia/${i.familyId}`)} />
      ) : (
        <View style={s.botones}>
          <Boton titulo="Crear la familia" icono="people-outline" compacto onPress={() => router.push({ pathname: '/medico/familias/nueva', params: { interesado: i.id } })} />
          {i.estado === 'nuevo' ? <Boton titulo="Ya lo contacté" variante="secundario" compacto onPress={() => void marcar('contactado')} /> : null}
          {i.estado !== 'archivado' ? <Boton titulo="Archivar" variante="contorno" compacto onPress={() => void marcar('archivado')} /> : null}
        </View>
      )}
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
