/**
 * Material para la familia (prompt maestro 7.12): sugeridos según la edad, solo entre los que cargó
 * el Dr., y "Enviar material": queda disponible en el portal y sale el aviso para Make.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { biblioteca, enviadosA, sugeridosPara, textoEdades } from '@/data/prevencion';
import type { Patient } from '@/data/types';
import { fechaCorta, hoyISO } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Aviso } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { BotonTexto } from './piezas';
import { colors } from '@/theme';

export function BloqueMaterial({ paciente: p }: { paciente: Patient }) {
  const { db, operaciones } = useApp();
  const sugeridos = sugeridosPara(db, p.id, hoyISO());
  const enviados = enviadosA(db, p.id);
  const hayBiblioteca = biblioteca(db).length > 0;
  const [mensaje, setMensaje] = useState<{ tono: 'info' | 'alerta'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  const enviar = async (materialId: string) => {
    const material = db.educationalMaterials.find((m) => m.id === materialId);
    if (!material) return;
    setEnviando(materialId);
    const error = await operaciones.enviarMaterial({ material, patientId: p.id });
    setEnviando(null);
    setMensaje(error
      ? { tono: 'alerta', texto: error }
      : { tono: 'info', texto: `Enviado. La familia lo va a ver en el portal (Etapa 6) y el aviso sale por Make cuando esté conectado (Etapa 8).` });
  };

  return (
    <Seccion titulo="Material para la familia" bajada="Sugerido según la edad, entre los que cargaste en Prevención">
      {!hayBiblioteca ? (
        <Texto color={colors.textMuted}>Todavía no hay materiales en la biblioteca.</Texto>
      ) : sugeridos.length === 0 ? (
        <Texto color={colors.textMuted}>No hay materiales nuevos para su edad.</Texto>
      ) : null}
      {sugeridos.map((m) => (
        <Tarjeta key={m.id} style={s.fila}>
          <View style={{ flex: 1 }}>
            <TextoFuerte>{m.title}</TextoFuerte>
            <TextoChico>{textoEdades(m)}{m.topics.length > 0 ? ` · ${m.topics.join(', ')}` : ''}</TextoChico>
          </View>
          <BotonTexto texto={enviando === m.id ? 'Enviando…' : 'Enviar'} onPress={() => { if (!enviando) void enviar(m.id); }} />
        </Tarjeta>
      ))}
      {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} /> : null}
      {enviados.length > 0 ? (
        <View style={{ gap: 4 }}>
          <TextoChico>Ya enviado:</TextoChico>
          {enviados.map(({ envio, material }) => <TextoChico key={envio.id}>• {material.title} · {fechaCorta(envio.sentAt)}</TextoChico>)}
        </View>
      ) : null}
      <BotonTexto texto="Ir a la biblioteca de Prevención" onPress={() => router.push('/medico/prevencion')} />
    </Seccion>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
