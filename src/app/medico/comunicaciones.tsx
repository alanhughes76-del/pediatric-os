/**
 * Comunicaciones (prompt maestro 7.14): registro de lo que sale por las automatizaciones, lo que entra
 * por los canales conectados (Etapa 8) y lo que el Dr. registra a mano. No es un chat: las conversaciones
 * con las familias van por PacienteX. Nada clínico en el asunto: lo clínico va en la historia.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import type { CanalComunicacion, ClaseComunicacion, DireccionComunicacion } from '@/data/types';
import { claseDe, comunicaciones, destinoDe, direccionDe, momentoDe, TEXTO_CANAL, TEXTO_CLASE, TEXTO_ESTADO, TEXTO_TIPO } from '@/data/comunicaciones';
import { aCampos, ahoraISO, deCampos, fechaHoraCorta } from '@/lib/fechas';
import { normalizar } from '@/lib/busqueda';
import { Pantalla } from '@/components/Pantalla';
import { Campo, Opciones, Aviso } from '@/components/Formulario';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { BotonTexto } from '@/components/ficha/piezas';
import { colors } from '@/theme';

type Todas<T extends string> = T | 'todas';
const TONO_CLASE = { administrativo: 'neutro', clinico: 'celeste', urgente: 'alerta' } as const;
const CANALES = (Object.keys(TEXTO_CANAL) as CanalComunicacion[]).map((v) => ({ valor: v, texto: TEXTO_CANAL[v] }));
const CLASES = (Object.keys(TEXTO_CLASE) as ClaseComunicacion[]).map((v) => ({ valor: v, texto: TEXTO_CLASE[v] }));

export default function Comunicaciones() {
  const { db } = useApp();
  const [direccion, setDireccion] = useState<Todas<DireccionComunicacion>>('todas');
  const [clase, setClase] = useState<Todas<ClaseComunicacion>>('todas');
  const [registrando, setRegistrando] = useState(false);
  const lista = comunicaciones(db, { direccion: direccion === 'todas' ? undefined : direccion, clase: clase === 'todas' ? undefined : clase });

  return (
    <Pantalla ancho>
      <Titulo>Comunicaciones</Titulo>
      <TextoChico>Es un registro, no un chat: las conversaciones con las familias siguen por PacienteX.</TextoChico>
      {registrando ? <Registrar onListo={() => setRegistrando(false)} /> : (
        <Boton titulo="+ Registrar una comunicación" variante="secundario" compacto onPress={() => setRegistrando(true)} />
      )}
      <View style={s.filtros}>
        <Opciones<Todas<DireccionComunicacion>> valor={direccion} onCambio={setDireccion}
          opciones={[{ valor: 'todas', texto: 'Todas' }, { valor: 'saliente', texto: 'Salientes' }, { valor: 'entrante', texto: 'Entrantes' }]} />
        <Opciones<Todas<ClaseComunicacion>> valor={clase} onCambio={setClase} opciones={[{ valor: 'todas', texto: 'Toda clase' }, ...CLASES]} />
      </View>
      {lista.length === 0 ? <Texto color={colors.textMuted}>No hay comunicaciones con este filtro.</Texto> : null}
      {lista.map((c) => {
        const entrante = direccionDe(c) === 'entrante';
        const k = claseDe(c);
        return (
          <Tarjeta key={c.id} style={s.fila}>
            <Ionicons name={entrante ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={26} color={k === 'urgente' ? colors.alert : colors.primary2}
              accessibilityLabel={entrante ? 'Entrante' : 'Saliente'} />
            <View style={{ flex: 1, gap: 4 }}>
              <TextoFuerte>{c.subject || TEXTO_TIPO[c.kind]}</TextoFuerte>
              <TextoChico>{fechaHoraCorta(momentoDe(c))} · {destinoDe(db, c)} · {TEXTO_CANAL[c.channel] ?? c.channel}</TextoChico>
              <View style={s.etiquetas}>
                <Etiqueta texto={TEXTO_CLASE[k]} tono={TONO_CLASE[k]} />
                <Etiqueta texto={TEXTO_TIPO[c.kind]} tono="neutro" />
                <Etiqueta texto={TEXTO_ESTADO[c.status] ?? c.status} tono={c.status === 'fallido' ? 'alerta' : c.status === 'entregado' ? 'verde' : 'neutro'} />
              </View>
            </View>
          </Tarjeta>
        );
      })}
      <TextoChico>Los recordatorios y avisos que salen por Make se registran solos cuando se conecten las automatizaciones (Etapa 8).</TextoChico>
    </Pantalla>
  );
}

/** Registrar a mano: una llamada, algo que se habló en persona… */
function Registrar({ onListo }: { onListo: () => void }) {
  const { db, operaciones } = useApp();
  const ahora = aCampos(ahoraISO());
  const [busqueda, setBusqueda] = useState('');
  const [familyId, setFamilyId] = useState<string>();
  const [patientId, setPatientId] = useState<string>();
  const [canal, setCanal] = useState<CanalComunicacion>('telefono');
  const [direccion, setDireccion] = useState<DireccionComunicacion>('entrante');
  const [clase, setClase] = useState<ClaseComunicacion>('administrativo');
  const [fecha, setFecha] = useState(ahora.fecha);
  const [hora, setHora] = useState(ahora.hora);
  const [asunto, setAsunto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const familia = db.families.find((f) => f.id === familyId);
  const q = normalizar(busqueda.trim());
  const opciones = q.length < 2 ? [] : db.families.filter((f) => !f.archivedAt && normalizar(f.name).includes(q)).slice(0, 6);
  const hijos = db.patients.filter((p) => p.familyId === familyId && !p.archivedAt);

  const guardar = async () => {
    const at = deCampos(fecha, hora);
    if (!at) return setError('Revisá la fecha y la hora (hh:mm).');
    const e = await operaciones.registrarComunicacion({ familyId, patientId, channel: canal, direction: direccion, classification: clase, at, subject: asunto });
    if (e) return setError(e);
    onListo();
  };

  return (
    <Tarjeta style={{ gap: 12 }}>
      <TextoFuerte>Registrar una comunicación</TextoFuerte>
      {familia ? (
        <View style={s.fila}>
          <Texto style={{ flex: 1 }}>{familia.name}</Texto>
          <BotonTexto texto="Cambiar" onPress={() => { setFamilyId(undefined); setPatientId(undefined); }} />
        </View>
      ) : (
        <>
          <Campo etiqueta="Familia (opcional)" value={busqueda} onChangeText={setBusqueda} placeholder="Escribí el apellido" autoCorrect={false} />
          {opciones.map((f) => <BotonTexto key={f.id} texto={f.name} onPress={() => { setFamilyId(f.id); setBusqueda(''); }} />)}
        </>
      )}
      {hijos.length > 0 ? (
        <Opciones etiqueta="¿Sobre qué hijo? (opcional)" valor={patientId} onCambio={(v) => setPatientId(v === patientId ? undefined : v)}
          opciones={hijos.map((h) => ({ valor: h.id, texto: h.firstName }))} />
      ) : null}
      <Opciones etiqueta="Dirección" valor={direccion} onCambio={setDireccion} opciones={[{ valor: 'entrante', texto: 'Entrante' }, { valor: 'saliente', texto: 'Saliente' }]} />
      <Opciones etiqueta="Canal" valor={canal} onCambio={setCanal} opciones={CANALES} />
      <Opciones etiqueta="Clasificación" valor={clase} onCambio={setClase} opciones={CLASES} />
      <View style={s.fila}>
        <View style={{ flex: 3 }}><CampoFecha etiqueta="Fecha" value={fecha} onChangeText={setFecha} /></View>
        <View style={{ flex: 2 }}><Campo etiqueta="Hora" value={hora} onChangeText={setHora} placeholder="hh:mm" /></View>
      </View>
      <Campo etiqueta="Asunto" value={asunto} onChangeText={setAsunto} maxLength={120} placeholder="Ej.: Llamó para reprogramar el control"
        ayuda="Breve y sin datos clínicos: lo clínico va en la historia del paciente." />
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      <Boton titulo="Guardar" icono="checkmark" compacto onPress={() => void guardar()} />
      <Boton titulo="Cancelar" variante="contorno" compacto onPress={onListo} />
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  filtros: { gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
