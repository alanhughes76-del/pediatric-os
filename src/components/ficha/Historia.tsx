/** Bloques de la ficha del médico: Crecimiento, Consultas, Registro de fiebre y Certificados y documentos. */
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { consultasDe, fiebreDe, medicionesDe, notaVigente, sinRevisar, TEXTO_VISITA } from '@/data/selectores';
import type { Patient } from '@/data/types';
import { ahoraISO, fechaCorta, hora } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { TarjetaCrecimiento } from '../crecimiento/TarjetaCrecimiento';
import { colors } from '@/theme';

export function BloqueCrecimiento({ paciente }: { paciente: Patient }) {
  const { db } = useApp();
  return (
    <Seccion titulo="Crecimiento" bajada={`${medicionesDe(db, paciente.id).length} mediciones`}>
      <Tarjeta>
        <TarjetaCrecimiento paciente={paciente} vista="medico" />
      </Tarjeta>
    </Seccion>
  );
}

/** Crea una consulta nueva para el paciente y la abre. */
export function useNuevaConsulta(patientId: string) {
  const { agregar } = useApp();
  return () => {
    const id = agregar('consultations', {
      patientId, occurredAt: ahoraISO(), modality: 'domicilio', visitType: 'control', status: 'realizada', rawText: '',
    }, 'consulta.crear');
    router.push(`/medico/consulta/${id}`);
  };
}

export function BloqueConsultas({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const consultas = consultasDe(db, patientId);
  const nueva = useNuevaConsulta(patientId);

  return (
    <Seccion titulo="Consultas">
      <Boton titulo="+ Nueva consulta" onPress={nueva} />
      {consultas.length === 0 ? <Texto color={colors.textMuted}>Todavía no hay consultas.</Texto> : null}
      {consultas.map((c) => {
        const nota = notaVigente(db, c.id);
        return (
          <Tarjeta key={c.id} onPress={() => router.push(`/medico/consulta/${c.id}`)} accessibilityLabel={`Abrir la consulta del ${fechaCorta(c.occurredAt)}`}>
            <View style={s.fila}>
              <View style={{ flex: 1, gap: 6 }}>
                <TextoFuerte>{fechaCorta(c.occurredAt)} {hora(c.occurredAt)} · {TEXTO_VISITA[c.visitType]}</TextoFuerte>
                <View style={s.etiquetas}>
                  <Etiqueta
                    texto={!nota ? 'Sin nota' : nota.status === 'aprobada' ? `Nota aprobada · v${nota.version}` : `Nota en borrador · v${nota.version}`}
                    tono={nota?.status === 'aprobada' ? 'celeste' : 'neutro'}
                  />
                  {nota?.clinicalFlag ? <Etiqueta texto="Bandera" tono="alerta" /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.primary3} />
            </View>
          </Tarjeta>
        );
      })}
    </Seccion>
  );
}

export function BloqueFiebre({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const registros = fiebreDe(db, patientId);
  const pendientes = registros.filter(sinRevisar).length;
  return (
    <Seccion titulo="Registro de fiebre">
      <Tarjeta onPress={() => router.push(`/medico/fiebre/${patientId}`)} accessibilityLabel="Abrir el registro de fiebre">
        <View style={s.fila}>
          <Ionicons name="thermometer-outline" size={26} color={colors.primary2} />
          <View style={{ flex: 1, gap: 4 }}>
            <TextoFuerte>{registros.length === 0 ? 'Sin registros' : `${registros.length} ${registros.length === 1 ? 'registro' : 'registros'}`}</TextoFuerte>
            {pendientes > 0 ? <Etiqueta texto={`${pendientes} sin revisar`} tono="azul" /> : registros.length > 0 ? <TextoChico>Todo revisado</TextoChico> : null}
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.primary3} />
        </View>
      </Tarjeta>
    </Seccion>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
