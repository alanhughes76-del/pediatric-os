/** Certificados (Etapa 5b): emitidos y anulados de todos los pacientes. Se emiten y se anulan desde la ficha. */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { nombreCompleto } from '@/data/selectores';
import { tipoCertificado } from '@/lib/certificados';
import { fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Opciones } from '@/components/Formulario';
import { EstadoVacio } from '@/components/Estados';
import { colors } from '@/theme';

type Filtro = 'todos' | 'emitido' | 'anulado';

export default function Certificados() {
  const { db } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const lista = db.certificates
    .filter((c) => !c.archivedAt && (filtro === 'todos' || c.status === filtro))
    .map((c) => ({ c, p: db.patients.find((x) => x.id === c.patientId && !x.archivedAt) }))
    .filter((x) => x.p)
    .sort((a, b) => b.c.date.localeCompare(a.c.date));

  return (
    <Pantalla ancho>
      <Titulo>Certificados</Titulo>
      <TextoChico>Se emiten desde la ficha de cada paciente. Un certificado emitido no se edita: se anula con motivo y se emite otro.</TextoChico>
      <Opciones opciones={[{ valor: 'todos', texto: 'Todos' }, { valor: 'emitido', texto: 'Emitidos' }, { valor: 'anulado', texto: 'Anulados' }]} valor={filtro} onCambio={setFiltro} />
      {lista.length === 0 ? <EstadoVacio icono="ribbon-outline" titulo="No hay certificados con ese filtro" /> : null}
      {lista.map(({ c, p }) => (
        <Tarjeta key={c.id} style={{ gap: 4 }} onPress={() => router.push({ pathname: '/medico/hijo/[id]', params: { id: p!.id, solapa: 'documentos' } })} accessibilityLabel={`${tipoCertificado(c.type).titulo} de ${nombreCompleto(p!)}`}>
          <View style={s.fila}>
            <TextoFuerte style={[{ flex: 1 }, c.status === 'anulado' && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>{tipoCertificado(c.type).titulo}</TextoFuerte>
            <Etiqueta texto={c.status === 'anulado' ? 'Anulado' : 'Emitido'} tono={c.status === 'anulado' ? 'alerta' : 'celeste'} />
          </View>
          <TextoChico>{nombreCompleto(p!)} · {fechaCorta(c.date)}{c.destination ? ` · para ${c.destination}` : ''}</TextoChico>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
