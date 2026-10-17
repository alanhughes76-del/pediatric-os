/** Estudios (Etapa 5): los que todavía no están revisados, de todos los pacientes. Primero los resultados que esperan revisión. */
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { estudiosAbiertos, TEXTO_ESTUDIO } from '@/data/seguimientoClinico';
import { nombreCompleto } from '@/data/selectores';
import { fechaCorta, hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { EstadoVacio } from '@/components/Estados';

export default function Estudios() {
  const { db } = useApp();
  const hoy = hoyISO();
  const lista = estudiosAbiertos(db);
  return (
    <Pantalla ancho>
      <Titulo>Estudios</Titulo>
      <TextoChico>Pedidos, realizados y resultados sin revisar. Se cargan y se revisan en la ficha de cada paciente.</TextoChico>
      {lista.length === 0 ? <EstadoVacio icono="flask-outline" titulo="No hay estudios pendientes" /> : null}
      {lista.map(({ estudio: e, paciente: p }) => {
        const vencido = !!e.reviewDate && e.reviewDate < hoy;
        return (
          <Tarjeta key={e.id} style={{ gap: 4 }} onPress={() => router.push({ pathname: '/medico/hijo/[id]', params: { id: p.id, solapa: 'estudios' } })} accessibilityLabel={`${e.study} de ${nombreCompleto(p)}`}>
            <View style={s.fila}>
              <TextoFuerte style={{ flex: 1 }}>{e.study}</TextoFuerte>
              <Etiqueta texto={TEXTO_ESTUDIO[e.status]} tono={e.status === 'resultado' ? 'naranja' : 'neutro'} />
              {vencido && e.status === 'resultado' ? <Etiqueta texto="Revisión vencida" tono="alerta" /> : null}
            </View>
            <TextoChico>{nombreCompleto(p)} · pedido el {fechaCorta(e.orderedDate)}{e.reviewDate ? ` · revisar el ${fechaCorta(e.reviewDate)}` : ''}</TextoChico>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
