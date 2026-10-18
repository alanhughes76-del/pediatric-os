import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/data/store';
import { paciente, nombreCompleto, TEXTO_VISITA } from '@/data/selectores';
import { ahoraISO, horasEntre, duracion, fechaCorta, hora } from '@/lib/fechas';
import { useAutoguardado } from '@/lib/useAutoguardado';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoChico } from '@/components/Texto';
import { Campo, Aviso, EstadoGuardado } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { colors } from '@/theme';

export default function Seguimiento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, actualizar } = useApp();
  const f = db.followUps.find((x) => x.id === id);
  const [mensaje, setMensaje] = useState(f?.message ?? '');
  const [copiado, setCopiado] = useState(false);
  const pendiente = useAutoguardado(mensaje, (v) => f && actualizar('followUps', f.id, { message: v }, 'seguimiento.mensaje'));
  if (!f) return <Pantalla><Texto>No encontramos este seguimiento.</Texto></Pantalla>;

  const p = paciente(db, f.patientId);
  const c = db.consultations.find((x) => x.id === f.consultationId);
  const horas = horasEntre(ahoraISO(), f.dueAt);
  const vencido = horas < 0;

  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Seguimiento' }} />
      <View style={{ gap: 6 }}>
        <Titulo>{p ? nombreCompleto(p) : 'Paciente'}</Titulo>
        {c ? <TextoChico>{TEXTO_VISITA[c.visitType]} · {fechaCorta(c.occurredAt)} {hora(c.occurredAt)}</TextoChico> : null}
        {f.status === 'resuelto' ? (
          <Etiqueta texto="Resuelto" tono="celeste" />
        ) : (
          <Etiqueta texto={vencido ? `Vencido hace ${duracion(horas)}` : `Vence en ${duracion(horas)}`} tono={vencido ? 'alerta' : 'azul'} />
        )}
      </View>

      <Campo etiqueta="Mensaje para la familia" ayuda="Armado con el resumen y la conducta. Podés editarlo." value={mensaje} onChangeText={setMensaje} multiline style={{ minHeight: 200 }} />
      <EstadoGuardado pendiente={pendiente} />

      <Boton
        titulo={copiado ? 'Copiado' : 'Copiar mensaje'}
        icono={copiado ? 'checkmark' : 'copy-outline'}
        variante="secundario"
        onPress={async () => { await Clipboard.setStringAsync(mensaje); setCopiado(true); }}
      />
      {c ? <Boton titulo="Ir a la consulta" icono="document-text-outline" variante="contorno" onPress={() => router.push(`/medico/consulta/${c.id}`)} /> : null}
      {f.status === 'pendiente' ? (
        <Boton
          titulo="Marcar resuelto"
          icono="checkmark-done-outline"
          onPress={() => { actualizar('followUps', f.id, { status: 'resuelto', resolvedAt: ahoraISO() }, 'seguimiento.resolver'); if (router.canGoBack()) router.back(); else router.replace('/medico'); }}
        />
      ) : null}
      <Aviso texto="Marcar resuelto es la única forma de que salga de la cola de seguimientos." />
      <TextoChico color={colors.textMuted}>El envío por mail o mensaje desde la app llega en una etapa posterior.</TextoChico>
    </Pantalla>
  );
}
