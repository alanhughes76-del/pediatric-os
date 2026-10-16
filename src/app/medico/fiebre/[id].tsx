/** Registro de fiebre de un paciente, del lado del médico. */
import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente, nombreCompleto, fiebreDe, consultasDe, consultaMasCercana, sinRevisar, TEXTO_VISITA } from '@/data/selectores';
import { resumenParaConsulta } from '@/lib/fiebre';
import { fechaCorta, hora } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoChico } from '@/components/Texto';
import { Seccion } from '@/components/Seccion';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { Opciones, Aviso } from '@/components/Formulario';
import { GraficoFiebre } from '@/components/fiebre/GraficoFiebre';
import { ListaFiebre } from '@/components/fiebre/ListaFiebre';

export default function FiebreMedico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const p = paciente(db, id);
  if (!p) return <Pantalla><Texto>No encontramos a este paciente.</Texto></Pantalla>;

  const registros = fiebreDe(db, p.id);
  const pendientes = registros.filter(sinRevisar).length;
  const nuevo = (tipo: 'toma' | 'antitermico') => router.push({ pathname: '/medico/fiebre/nuevo', params: { paciente: p.id, tipo } });

  return (
    <Pantalla>
      <Stack.Screen options={{ title: `Fiebre · ${p.firstName}` }} />
      <View style={{ gap: 4 }}>
        <Titulo>{nombreCompleto(p)}</Titulo>
        <TextoChico>{registros.length} registros · {pendientes} sin revisar</TextoChico>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Boton compacto titulo="+ Temperatura" variante="secundario" onPress={() => nuevo('toma')} /></View>
        <View style={{ flex: 1 }}><Boton compacto titulo="+ Antitérmico" variante="secundario" onPress={() => nuevo('antitermico')} /></View>
      </View>
      <TextoChico>Registro a mano: para cargar lo que te cuentan por teléfono.</TextoChico>

      <Seccion titulo="Curva de temperatura">
        <Tarjeta><GraficoFiebre registros={registros} /></Tarjeta>
      </Seccion>

      <ResumenParaConsulta patientId={p.id} />

      <Seccion titulo="Registros" bajada="No entran a la historia clínica hasta que los marcás revisados">
        <ListaFiebre registros={registros} vista="medico" />
      </Seccion>
    </Pantalla>
  );
}

/** "Agregar resumen al texto de la consulta": suma los registros vinculados al texto original de la nota. */
function ResumenParaConsulta({ patientId }: { patientId: string }) {
  const { db, actualizar } = useApp();
  const registros = fiebreDe(db, patientId);
  const consultas = consultasDe(db, patientId).slice(0, 6);
  const sugerida = registros[0] ? consultaMasCercana(db, patientId, registros[0].at) : consultas[0];
  const [elegida, setElegida] = useState(sugerida?.id);
  const [agregado, setAgregado] = useState<string | null>(null);
  if (consultas.length === 0) return null;

  const consulta = db.consultations.find((c) => c.id === elegida);
  const vinculados = registros.filter((r) => r.consultationId === elegida);

  const agregar = () => {
    if (!consulta || vinculados.length === 0) return;
    const resumen = resumenParaConsulta(vinculados);
    const texto = consulta.rawText.trim() ? `${consulta.rawText.trim()}\n\n${resumen}` : resumen;
    actualizar('consultations', consulta.id, { rawText: texto }, 'consulta.agregar-resumen-fiebre');
    setAgregado(consulta.id);
  };

  return (
    <Seccion titulo="Resumen para la consulta">
      <Tarjeta style={{ gap: 12 }}>
        <Opciones
          columna
          etiqueta="Consulta"
          opciones={consultas.map((c) => ({
            valor: c.id,
            texto: `${fechaCorta(c.occurredAt)} ${hora(c.occurredAt)} · ${TEXTO_VISITA[c.visitType]}`,
            detalle: c.id === sugerida?.id ? 'Sugerida: la más cercana al último registro' : undefined,
          }))}
          valor={elegida}
          onCambio={(v) => { setElegida(v); setAgregado(null); }}
        />
        <TextoChico>{vinculados.length} {vinculados.length === 1 ? 'registro vinculado' : 'registros vinculados'} a esta consulta.</TextoChico>
        {vinculados.length === 0 ? <Aviso texto="Vinculá al menos un registro a esta consulta (abajo, en cada registro)." /> : null}
        <Boton titulo="Agregar resumen al texto de la consulta" icono="document-text-outline" deshabilitado={vinculados.length === 0} onPress={agregar} />
        {agregado ? (
          <>
            <Aviso texto="Listo: el resumen quedó al final del texto original de la consulta." />
            <Boton titulo="Ir a la consulta" variante="contorno" onPress={() => router.push(`/medico/consulta/${agregado}`)} />
          </>
        ) : null}
      </Tarjeta>
    </Seccion>
  );
}
