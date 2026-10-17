/**
 * Crecimiento (Etapa 4): la última medición de cada paciente con su percentilo. Arriba, los que
 * tienen un aviso (valor extremo o probable error de carga); después, los que hace más que no se
 * miden. Cada fila abre la pestaña Crecimiento de la ficha (curvas y tabla).
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { crecimientoDePacientes } from '@/data/clinica';
import { nombreCompleto } from '@/data/selectores';
import type { Medida } from '@/lib/crecimiento';
import { TEXTO_AVISO } from '@/lib/percentiles';
import { fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Campo, Interruptor } from '@/components/Formulario';
import { EstadoVacio } from '@/components/Estados';
import { colors } from '@/theme';

const coma = (n: number, d = 1) => n.toFixed(d).replace('.', ',');
const textoMedida = (nombre: string, unidad: string, m?: Medida) =>
  !m ? null : `${nombre} ${coma(m.valor)} ${unidad}${m.resultado.ok ? ` (P${Math.round(m.resultado.percentil)})` : ''}`;

export default function Crecimiento() {
  const { db } = useApp();
  const [q, setQ] = useState('');
  const [soloAvisos, setSoloAvisos] = useState(false);
  const filas = crecimientoDePacientes(db, q).filter((f) => !soloAvisos || f.conAviso);

  return (
    <Pantalla ancho>
      <Titulo>Crecimiento</Titulo>
      <TextoChico>Última medición de cada paciente. Las curvas y la tabla están en la ficha.</TextoChico>
      <Campo value={q} onChangeText={setQ} placeholder="Buscá por nombre, iniciales, DNI o fecha de nacimiento" accessibilityLabel="Buscar paciente" autoCorrect={false} />
      <Interruptor texto="Solo los que tienen avisos" activo={soloAvisos} onCambio={setSoloAvisos} />
      {filas.length === 0 ? <EstadoVacio icono="trending-up-outline" titulo={soloAvisos ? 'Ninguna medición con avisos' : 'No hay pacientes con ese nombre'} /> : null}
      {filas.map(({ paciente: p, ultima: u, conAviso }) => {
        const avisos = u ? [u.peso, u.talla, u.pc, u.imc, u.pesoTalla].flatMap((m) => (m?.resultado.ok && m.resultado.aviso ? [TEXTO_AVISO[m.resultado.aviso]] : [])) : [];
        const medidas = u ? [textoMedida('Peso', 'kg', u.peso), textoMedida('Talla', 'cm', u.talla), textoMedida('PC', 'cm', u.pc)].filter(Boolean) : [];
        return (
          <Tarjeta
            key={p.id}
            style={s.fila}
            onPress={() => router.push({ pathname: '/medico/hijo/[id]', params: { id: p.id, solapa: 'crecimiento' } })}
            accessibilityLabel={`Crecimiento de ${nombreCompleto(p)}`}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <TextoFuerte>{nombreCompleto(p)}</TextoFuerte>
              {u ? (
                <>
                  <TextoChico>{fechaCorta(u.fecha)}{u.corregida ? ' · edad corregida' : ''}</TextoChico>
                  {medidas.length > 0 ? <TextoChico color={colors.text}>{medidas.join(' · ')}</TextoChico> : null}
                </>
              ) : <TextoChico>Sin mediciones cargadas.</TextoChico>}
              {conAviso ? <View style={s.etiquetas}>{[...new Set(avisos)].map((a) => <Etiqueta key={a} texto={a} tono="alerta" />)}</View> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
