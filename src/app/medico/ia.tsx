/**
 * IA Asistente (prompt maestro 7.18): elegir un paciente y pedir una propuesta, y el registro de los
 * últimos usos (qué acción, de qué paciente, cuándo y si la aceptaste).
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { nombreCompleto } from '@/data/selectores';
import { filtrarPacientes } from '@/lib/busqueda';
import { fechaCorta, fechaHoraCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Campo } from '@/components/Formulario';
import { Caja, Grilla } from '@/components/Caja';
import { Etiqueta } from '@/components/Etiqueta';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { BotonTexto } from '@/components/ficha/piezas';
import { PanelIA, TEXTO_ACCION } from '@/components/ia/PanelIA';
import { colors } from '@/theme';

export default function IAAsistente() {
  const { db } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [patientId, setPatientId] = useState<string>();
  const paciente = db.patients.find((p) => p.id === patientId);
  const resultados = busqueda.trim().length >= 2 ? filtrarPacientes(db.patients, 'todos', busqueda).slice(0, 6) : [];
  const usos = db.aiInteractions.slice(0, 15);

  return (
    <Pantalla ancho>
      <Titulo>IA Asistente</Titulo>
      <TextoChico>Propone; vos decidís. Se le manda solo lo necesario, sin nombre, DNI, dirección ni contactos. Cada uso queda registrado.</TextoChico>
      <Grilla>
        <Caja titulo="Paciente" icono="sparkles-outline" color="violeta">
          {paciente ? (
            <View style={s.fila}>
              <TextoFuerte style={{ flex: 1 }}>{nombreCompleto(paciente)}</TextoFuerte>
              <BotonTexto texto="Cambiar" onPress={() => setPatientId(undefined)} />
            </View>
          ) : (
            <>
              <Campo value={busqueda} onChangeText={setBusqueda} placeholder="Buscá por nombre o apellido" autoCorrect={false} accessibilityLabel="Buscar paciente" />
              {resultados.map((p) => <BotonTexto key={p.id} texto={`${nombreCompleto(p)} · ${fechaCorta(p.birthDate)}`} onPress={() => { setPatientId(p.id); setBusqueda(''); }} />)}
            </>
          )}
          {paciente ? <PanelIA key={paciente.id} patientId={paciente.id} /> : <Texto color={colors.textMuted}>Elegí un paciente para empezar. La evolución de una consulta se prepara desde la nota de la consulta.</Texto>}
        </Caja>
        <Caja titulo="Últimos usos" icono="time-outline" color="violeta">
          {usos.length === 0 ? <Texto color={colors.textMuted}>Todavía no usaste la IA.</Texto> : null}
          {usos.map((u) => {
            const p = db.patients.find((x) => x.id === u.patientId);
            return (
              <View key={u.id} style={s.uso}>
                <View style={{ flex: 1 }}>
                  <Texto>{TEXTO_ACCION[u.action] ?? u.action}</Texto>
                  <TextoChico>{fechaHoraCorta(u.createdAt)} · {p ? nombreCompleto(p) : 'Paciente'}</TextoChico>
                </View>
                <Etiqueta
                  texto={u.status !== 'ok' ? 'Sin respuesta' : u.aceptado === null ? 'Sin decidir' : u.aceptado ? 'Aceptada' : 'Descartada'}
                  tono={u.status !== 'ok' ? 'neutro' : u.aceptado ? 'verde' : u.aceptado === false ? 'neutro' : 'naranja'}
                />
              </View>
            );
          })}
        </Caja>
      </Grilla>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  uso: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
});
