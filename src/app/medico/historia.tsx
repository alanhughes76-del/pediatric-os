/**
 * Historia clínica (Etapa 4): lo que conviene tener a mano de todos los pacientes —notas sin
 * aprobar, problemas activos y alergias—. Cada fila abre la ficha, donde se edita.
 */
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { alergiasCargadas, listaConsultas, problemasActivos } from '@/data/clinica';
import { nombreCompleto } from '@/data/selectores';
import { fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Caja, Grilla } from '@/components/Caja';
import { colors } from '@/theme';

const GRAVEDAD = { leve: 'leve', moderada: 'moderada', grave: 'grave' } as const;

export default function HistoriaClinica() {
  const { db } = useApp();
  const borradores = listaConsultas(db, 'borrador');
  const problemas = problemasActivos(db);
  const alergias = alergiasCargadas(db);
  const ficha = (id: string) => router.push({ pathname: '/medico/hijo/[id]', params: { id, solapa: 'historia' } });

  return (
    <Pantalla ancho>
      <Titulo>Historia clínica</Titulo>
      <TextoChico>De todos los pacientes. Los antecedentes, problemas y alergias se editan en la ficha de cada uno.</TextoChico>
      <Grilla>
        <Caja titulo={`Notas sin aprobar (${borradores.length})`} icono="document-text-outline" color="naranja">
          {borradores.length === 0 ? <Texto color={colors.textMuted}>Todas las notas están aprobadas.</Texto> : null}
          {borradores.map(({ consulta: c, paciente: p, nota }) => (
            <Tarjeta key={c.id} onPress={() => router.push(`/medico/consulta/${c.id}`)} accessibilityLabel={`Nota en borrador de ${nombreCompleto(p)}`}>
              <TextoFuerte>{nombreCompleto(p)}</TextoFuerte>
              <TextoChico>Consulta del {fechaCorta(c.occurredAt)} · borrador v{nota!.version}</TextoChico>
            </Tarjeta>
          ))}
        </Caja>

        <Caja titulo={`Problemas activos (${problemas.length})`} icono="pulse-outline" color="celeste">
          {problemas.length === 0 ? <Texto color={colors.textMuted}>No hay problemas activos cargados.</Texto> : null}
          {problemas.map(({ problema: pr, paciente: p }) => (
            <Tarjeta key={pr.id} onPress={() => ficha(p.id)} accessibilityLabel={`${pr.description}, ${nombreCompleto(p)}`}>
              <TextoFuerte>{pr.description}</TextoFuerte>
              <View style={s.fila}>
                <TextoChico style={{ flex: 1 }}>{nombreCompleto(p)}{pr.since ? ` · desde ${fechaCorta(pr.since)}` : ''}</TextoChico>
                {pr.visibleToFamily ? <Etiqueta texto="Lo ve la familia" tono="verde" /> : null}
              </View>
            </Tarjeta>
          ))}
        </Caja>

        <Caja titulo={`Alergias (${alergias.length})`} icono="warning-outline" color="rosado">
          {alergias.length === 0 ? <Texto color={colors.textMuted}>No hay alergias cargadas.</Texto> : null}
          {alergias.map(({ alergia: a, paciente: p }) => (
            <Tarjeta key={a.id} onPress={() => ficha(p.id)} accessibilityLabel={`Alergia a ${a.allergen}, ${nombreCompleto(p)}`}>
              <View style={s.fila}>
                <TextoFuerte style={{ flex: 1 }}>{a.allergen}</TextoFuerte>
                <Etiqueta texto={a.status === 'confirmada' ? 'Confirmada' : 'Referida'} tono={a.status === 'confirmada' ? 'alerta' : 'naranja'} />
              </View>
              <TextoChico>{nombreCompleto(p)} · {GRAVEDAD[a.severity]}{a.reaction ? ` · ${a.reaction}` : ''}</TextoChico>
            </Tarjeta>
          ))}
        </Caja>
      </Grilla>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
