/** Consultas (Etapa 4): todas las consultas, con el estado de su nota. Se abren a la consulta. */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { listaConsultas, type FiltroConsultas } from '@/data/clinica';
import { nombreCompleto, TEXTO_VISITA } from '@/data/selectores';
import { fechaCorta, hora } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Campo, Opciones } from '@/components/Formulario';
import { EstadoVacio } from '@/components/Estados';
import { colors } from '@/theme';

const POR_PAGINA = 40;

export default function Consultas() {
  const { db } = useApp();
  const [filtro, setFiltro] = useState<FiltroConsultas>('todas');
  const [q, setQ] = useState('');
  const [cuantas, setCuantas] = useState(POR_PAGINA);
  const filas = listaConsultas(db, filtro, q);
  const borradores = listaConsultas(db, 'borrador').length;

  return (
    <Pantalla ancho>
      <Titulo>Consultas</Titulo>
      <Opciones
        opciones={[
          { valor: 'todas', texto: 'Todas' },
          { valor: 'borrador', texto: `Nota en borrador (${borradores})` },
          { valor: 'sin-nota', texto: 'Sin nota' },
        ]}
        valor={filtro}
        onCambio={(v) => { setFiltro(v); setCuantas(POR_PAGINA); }}
      />
      <Campo value={q} onChangeText={setQ} placeholder="Buscá por nombre, iniciales, DNI o fecha de nacimiento" accessibilityLabel="Buscar consultas por paciente" autoCorrect={false} />
      {filas.length === 0 ? <EstadoVacio icono="medkit-outline" titulo="No hay consultas con ese filtro" /> : null}
      {filas.slice(0, cuantas).map(({ consulta: c, paciente: p, nota, estado }) => (
        <Tarjeta key={c.id} style={s.fila} onPress={() => router.push(`/medico/consulta/${c.id}`)} accessibilityLabel={`Consulta de ${nombreCompleto(p)} del ${fechaCorta(c.occurredAt)}`}>
          <View style={{ flex: 1, gap: 4 }}>
            <TextoFuerte>{nombreCompleto(p)}</TextoFuerte>
            <TextoChico>{fechaCorta(c.occurredAt)} {hora(c.occurredAt)} · {TEXTO_VISITA[c.visitType]}</TextoChico>
            <View style={s.etiquetas}>
              {estado === 'sin-nota' ? <Etiqueta texto="Sin nota" tono="neutro" /> : null}
              {estado === 'borrador' ? <Etiqueta texto={`Nota en borrador · v${nota!.version}`} tono="naranja" /> : null}
              {estado === 'aprobada' ? <Etiqueta texto={`Nota aprobada · v${nota!.version}`} tono="celeste" /> : null}
              {nota?.clinicalFlag && estado === 'aprobada' ? <Etiqueta texto="Bandera clínica" tono="alerta" /> : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
        </Tarjeta>
      ))}
      {filas.length > cuantas ? (
        <Tarjeta onPress={() => setCuantas((n) => n + POR_PAGINA)} accessibilityLabel="Ver más consultas">
          <TextoFuerte color={colors.primary2}>Ver más ({filas.length - cuantas})</TextoFuerte>
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
