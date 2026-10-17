/**
 * Documentos (Etapa 5b): los archivos de todos los pacientes, del más nuevo al más viejo.
 * Se suben y se habilitan para la familia desde la ficha. Se leen con tu sesión: nunca hay enlaces públicos.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { nombreCompleto } from '@/data/selectores';
import type { DocumentKind } from '@/data/types';
import { fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Opciones, Aviso } from '@/components/Formulario';
import { EstadoVacio } from '@/components/Estados';
import { BotonTexto } from '@/components/ficha/piezas';
import { TEXTO_TIPO_DOCUMENTO, tipoDeDocumento } from '@/components/ficha/Documentos';
import { useAbrirDocumento } from '@/components/documentos/Adjuntos';

type Filtro = 'todos' | DocumentKind;

export default function Documentos() {
  const { db } = useApp();
  const { abrir, error } = useAbrirDocumento();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const lista = db.documents
    .filter((d) => !d.archivedAt && (filtro === 'todos' || tipoDeDocumento(d) === filtro))
    .map((d) => ({ d, p: db.patients.find((x) => x.id === d.patientId && !x.archivedAt) }))
    .filter((x) => x.p)
    .sort((a, b) => b.d.date.localeCompare(a.d.date))
    .slice(0, 100);

  return (
    <Pantalla ancho>
      <Titulo>Documentos</Titulo>
      <TextoChico>Se suben desde la ficha de cada paciente (pestaña Documentos).</TextoChico>
      <Opciones
        opciones={[{ valor: 'todos', texto: 'Todos' }, ...(['certificado', 'receta', 'estudio', 'otro'] as DocumentKind[]).map((k) => ({ valor: k, texto: TEXTO_TIPO_DOCUMENTO[k] }))]}
        valor={filtro}
        onCambio={setFiltro}
      />
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      {lista.length === 0 ? <EstadoVacio icono="folder-open-outline" titulo="No hay documentos con ese filtro" /> : null}
      {lista.map(({ d, p }) => (
        <Tarjeta key={d.id} style={{ gap: 4 }}>
          <View style={s.fila}>
            <TextoFuerte style={{ flex: 1 }}>{d.title}</TextoFuerte>
            <Etiqueta texto={TEXTO_TIPO_DOCUMENTO[tipoDeDocumento(d)]} tono="neutro" />
            {d.visibleToFamily ? <Etiqueta texto="Lo ve la familia" tono="verde" /> : null}
          </View>
          <TextoChico>{nombreCompleto(p!)} · {fechaCorta(d.date)}</TextoChico>
          <View style={s.fila}>
            <BotonTexto texto="Ver" onPress={() => void abrir(d)} />
            <BotonTexto texto="Ir a la ficha" onPress={() => router.push({ pathname: '/medico/hijo/[id]', params: { id: p!.id, solapa: 'documentos' } })} />
          </View>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, columnGap: 16 },
});
