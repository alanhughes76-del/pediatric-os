/**
 * Formulario de un turno (alta y edición). Pensado para el celular: pocos campos, opciones grandes.
 * - Familia y pacientes: los hermanos pueden ir en la misma visita. Un turno prenatal va con la familia.
 * - Dirección: se elige una de los adultos o se escribe otra. Es una copia: no cambia la guardada.
 * - La duración se completa sola según el tipo (Configuración), y se puede cambiar.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { MODALIDADES, TIPOS_TURNO, TEXTO_TIPO_TURNO, inicioDe, zonaDe, diaDe, horaDe, type ModalidadTurno, type TipoTurno } from '@shared/agenda';
import type { Appointment } from '@/data/types';
import type { DatosTurno } from '@/data/contrato';
import { useApp } from '@/data/store';
import { nombreCompleto, TEXTO_MODALIDAD } from '@/data/selectores';
import { normalizar } from '@shared/duplicados';
import { ahoraISO, deFecha } from '@/lib/fechas';
import { Campo, Casilla, Interruptor, Opciones, Aviso } from '@/components/Formulario';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { colors } from '@/theme';

const aDdMm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;

export interface Inicial {
  turno?: Appointment;
  familyId?: string;
  patientId?: string;
  /** "AAAA-MM-DD" */
  dia?: string;
}

export function FormularioTurno({ inicial, conHorario, conConfirmar, textoGuardar, guardando, onGuardar, respuesta }: {
  inicial: Inicial;
  /** Muestra fecha, hora y duración (alta). En la edición, el horario se cambia con "Reprogramar". */
  conHorario: boolean;
  conConfirmar: boolean;
  textoGuardar: string;
  guardando: boolean;
  onGuardar: (datos: DatosTurno, confirmar: boolean) => void;
  /** Respuesta del servidor (error o avisos): va junto al botón, donde está mirando quien guarda. */
  respuesta?: ReactNode;
}) {
  const { db } = useApp();
  const t = inicial.turno;
  const pacienteInicial = inicial.patientId ? db.patients.find((p) => p.id === inicial.patientId) : undefined;

  const [familyId, setFamilyId] = useState<string | null>(t?.familyId ?? inicial.familyId ?? pacienteInicial?.familyId ?? null);
  const [patientIds, setPatientIds] = useState<string[]>(t?.patientIds ?? (pacienteInicial ? [pacienteInicial.id] : []));
  const [busqueda, setBusqueda] = useState('');
  const [type, setType] = useState<TipoTurno>(t?.type ?? 'control');
  const [modality, setModality] = useState<ModalidadTurno>(t?.modality ?? 'domicilio');
  const [fecha, setFecha] = useState(aDdMm(t?.day ?? inicial.dia ?? diaDe(ahoraISO())));
  const [horaTxt, setHoraTxt] = useState(t ? horaDe(t.start) : '');
  const [duracion, setDuracion] = useState(String(t?.durationMin ?? db.agenda.duracionMin[t?.type ?? 'control']));
  const [duracionTocada, setDuracionTocada] = useState(!!t);
  const [direccionId, setDireccionId] = useState<string>(t ? (t.address?.addressId ?? (t.address ? 'otra' : '')) : '');
  const [texto, setTexto] = useState(t?.address && !t.address.addressId ? t.address.text : '');
  const [localidad, setLocalidad] = useState(t?.address && !t.address.addressId ? t.address.locality : '');
  const [reason, setReason] = useState(t?.reason ?? '');
  const [opsNotes, setOpsNotes] = useState(t?.opsNotes ?? '');
  const [confirmar, setConfirmar] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const familia = db.families.find((f) => f.id === familyId);
  const hijos = db.patients.filter((p) => p.familyId === familyId && !p.archivedAt);
  const adultos = db.guardians.filter((g) => g.familyId === familyId && !g.archivedAt);
  const direcciones = db.addresses.filter((a) => adultos.some((g) => g.id === a.guardianId) && !a.archivedAt);

  // Dirección por defecto: la primera de la familia.
  const direccionElegida = direccionId || (direcciones[0]?.id ?? 'otra');
  const guardada = direcciones.find((a) => a.id === direccionElegida);
  const address = modality !== 'domicilio' ? null
    : guardada ? { text: guardada.street, locality: guardada.locality, addressId: guardada.id }
    : texto.trim() || localidad.trim() ? { text: texto.trim(), locality: localidad.trim() } : null;
  const zona = address ? zonaDe(address.locality || address.text, db.agenda.zonas) : null;

  const resultados = useMemo(() => {
    const q = normalizar(busqueda);
    if (q.length < 2) return [];
    return db.families
      .filter((f) => !f.archivedAt && (normalizar(f.name).includes(q)
        || db.patients.some((p) => p.familyId === f.id && normalizar(`${p.firstName} ${p.lastName}`).includes(q))))
      .slice(0, 6);
  }, [busqueda, db.families, db.patients]);

  const elegirFamilia = (id: string | null) => {
    setFamilyId(id);
    setPatientIds([]);
    setDireccionId('');
    setBusqueda('');
  };
  const cambiarTipo = (v: TipoTurno) => {
    setType(v);
    if (!duracionTocada) setDuracion(String(db.agenda.duracionMin[v]));
    if (v === 'prenatal') setPatientIds([]);
  };

  const guardar = () => {
    setError(null);
    if (!familyId && !t?.porIdentificar) return setError('Elegí la familia.');
    if (type !== 'prenatal' && patientIds.length === 0) return setError(t?.porIdentificar && !familyId ? 'Para guardar, elegí la familia y el paciente.' : 'Elegí al menos un paciente.');
    if (type === 'prenatal' && !familyId) return setError('Un turno prenatal va con la familia: elegila.');
    let start = t?.start ?? '';
    let durationMin = t?.durationMin ?? 0;
    if (conHorario) {
      const dia = deFecha(fecha);
      const inicio = dia && /^\d{1,2}[:.]\d{2}$/.test(horaTxt.trim()) ? inicioDe(dia, horaTxt.trim().replace('.', ':').padStart(5, '0')) : null;
      if (!inicio) return setError('Revisá la fecha y la hora (hh:mm).');
      start = inicio;
      durationMin = Number(duracion);
      if (!Number.isInteger(durationMin) || durationMin < 10 || durationMin > 480) return setError('La duración tiene que estar entre 10 y 480 minutos.');
    }
    onGuardar({ start, durationMin, type, modality, familyId, patientIds, address, reason: reason.trim(), opsNotes: opsNotes.trim() }, confirmar);
  };

  return (
    <View style={{ gap: 18 }}>
      {t?.porIdentificar ? (
        <Aviso
          icono="person-circle-outline"
          texto={`Pedido por ${t.porIdentificar.name || 'alguien sin nombre'}${t.porIdentificar.dni ? `, DNI ${t.porIdentificar.dni}` : ''}${t.porIdentificar.phone ? `, ${t.porIdentificar.phone}` : ''}${t.porIdentificar.email ? `, ${t.porIdentificar.email}` : ''}. Elegí la familia para vincularlo.`}
        />
      ) : null}

      {/* Familia */}
      <View style={{ gap: 8 }}>
        <TextoFuerte>Familia</TextoFuerte>
        {familia ? (
          <Tarjeta style={s.elegida}>
            <Texto style={{ flex: 1 }}>{familia.name}</Texto>
            <Boton titulo="Cambiar" variante="contorno" compacto onPress={() => elegirFamilia(null)} />
          </Tarjeta>
        ) : (
          <>
            <Campo value={busqueda} onChangeText={setBusqueda} placeholder="Buscá por apellido o por el nombre de un chico" autoCorrect={false} accessibilityLabel="Buscar familia" />
            {resultados.map((f) => (
              <Tarjeta key={f.id} onPress={() => elegirFamilia(f.id)} accessibilityLabel={`Elegir ${f.name}`}>
                <Texto>{f.name}</Texto>
                <TextoChico>{db.patients.filter((p) => p.familyId === f.id && !p.archivedAt).map((p) => p.firstName).join(', ') || 'Sin hijos cargados'}</TextoChico>
              </Tarjeta>
            ))}
            {busqueda.trim().length >= 2 && resultados.length === 0 ? <TextoChico>No encontramos esa familia. Cargala desde Familias.</TextoChico> : null}
          </>
        )}
      </View>

      {/* Pacientes */}
      {familia && type !== 'prenatal' ? (
        <View style={{ gap: 4 }}>
          <TextoFuerte>¿A quién se ve?</TextoFuerte>
          {hijos.length === 0 ? <TextoChico>Esta familia todavía no tiene hijos cargados. Si es por un bebé por nacer, elegí “Prenatal”.</TextoChico> : null}
          {hijos.map((h) => (
            <Casilla
              key={h.id}
              texto={nombreCompleto(h)}
              marcada={patientIds.includes(h.id)}
              onCambio={(v) => setPatientIds((xs) => (v ? [...xs, h.id] : xs.filter((x) => x !== h.id)))}
            />
          ))}
          {hijos.length > 1 ? <TextoChico>Los hermanos pueden ir en la misma visita.</TextoChico> : null}
        </View>
      ) : null}

      <Opciones etiqueta="Tipo" opciones={TIPOS_TURNO.map((v) => ({ valor: v, texto: TEXTO_TIPO_TURNO[v] }))} valor={type} onCambio={cambiarTipo} />
      <Opciones etiqueta="Modalidad" opciones={MODALIDADES.map((v) => ({ valor: v, texto: TEXTO_MODALIDAD[v] }))} valor={modality} onCambio={setModality} />

      {conHorario ? (
        <View style={s.fila}>
          <View style={{ flex: 3, minWidth: 150 }}><CampoFecha etiqueta="Fecha" value={fecha} onChangeText={setFecha} /></View>
          <View style={{ flex: 2, minWidth: 100 }}><Campo etiqueta="Hora" value={horaTxt} onChangeText={setHoraTxt} placeholder="hh:mm" keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flex: 2, minWidth: 100 }}>
            <Campo etiqueta="Minutos" value={duracion} onChangeText={(v) => { setDuracion(v.replace(/\D/g, '')); setDuracionTocada(true); }} keyboardType="number-pad" />
          </View>
        </View>
      ) : null}

      {/* Dirección */}
      {modality === 'domicilio' ? (
        <View style={{ gap: 8 }}>
          <Opciones
            etiqueta="Dirección de la visita"
            columna
            opciones={[
              ...direcciones.map((a) => ({ valor: a.id, texto: a.street, detalle: `${a.locality} · de ${adultos.find((g) => g.id === a.guardianId)?.firstName ?? ''}` })),
              { valor: 'otra', texto: 'Otra dirección', detalle: 'Solo para este turno' },
            ]}
            valor={direccionElegida}
            onCambio={setDireccionId}
          />
          {direccionElegida === 'otra' ? (
            <>
              <Campo etiqueta="Calle y número" value={texto} onChangeText={setTexto} placeholder="Av. Maipú 1450, 3.º B" />
              <Campo etiqueta="Localidad o barrio" value={localidad} onChangeText={setLocalidad} placeholder="Vicente López" ayuda="No cambia la dirección guardada de la familia." />
            </>
          ) : null}
          {address ? (
            zona
              ? <TextoChico>Zona: {zona}</TextoChico>
              : <Aviso texto="Esta dirección queda fuera de la zona de cobertura. Podés dar el turno igual." />
          ) : null}
        </View>
      ) : null}

      <Campo etiqueta="Motivo general" value={reason} onChangeText={setReason} maxLength={200} placeholder="Control, fiebre, vacunas…" ayuda="Solo lo necesario para organizar la visita. Lo clínico va en la consulta." />
      <Campo etiqueta="Notas operativas" value={opsNotes} onChangeText={setOpsNotes} maxLength={1000} multiline placeholder="Timbre, estacionamiento, quién recibe…" ayuda="Solo las ven vos y el asistente. La familia no." />

      {conConfirmar ? <Interruptor texto={confirmar ? 'Queda confirmado' : 'Queda pendiente de confirmación'} activo={confirmar} onCambio={setConfirmar} /> : null}
      {/* Un error del propio formulario reemplaza a la respuesta anterior del servidor. */}
      {error ? <Aviso tono="alerta" texto={error} /> : respuesta}
      <Boton titulo={guardando ? 'Guardando…' : textoGuardar} icono="checkmark" deshabilitado={guardando} onPress={guardar} />
      <TextoChico color={colors.textMuted}>Duración sugerida por tipo, buffer de {db.agenda.bufferMin} min entre visitas y horarios: se cambian en Configuración.</TextoChico>
    </View>
  );
}

const s = StyleSheet.create({
  elegida: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
