/**
 * Nota clínica versionada: Borrador → Aprobada → Reemplazada.
 * - El texto original de la consulta se guarda solo.
 * - "Guardar cambios" deja el borrador para seguir después.
 * - "Aprobar y guardar en historia clínica" fija la versión (inmutable).
 * - "Corregir esta nota" crea una versión nueva en borrador y la anterior queda Reemplazada.
 * - Al aprobar con bandera clínica, nace (o se actualiza) el seguimiento pendiente.
 */
import { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { versionesDeNota, notaVigente, adultosDe } from '@/data/selectores';
import { mailDelResumen } from '@shared/resumen';
import type { ClinicalNote, Consultation, Patient } from '@/data/types';
import type { CamposNota } from '@/lib/notaIA';
import { ahoraISO, fechaCorta, hora } from '@/lib/fechas';
import { useAutoguardado } from '@/lib/useAutoguardado';
import { Campo, Casilla, Aviso, EstadoGuardado } from '../Formulario';
import { Boton } from '../Boton';
import { Etiqueta } from '../Etiqueta';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { colors, size } from '@/theme';

const VACIA: CamposNota = { findings: '', plan: '', familySummary: '', allergiesMedication: '', clinicalFlag: false };

const CAMPOS: { clave: keyof Omit<CamposNota, 'clinicalFlag'>; titulo: string; ayuda?: string }[] = [
  { clave: 'findings', titulo: 'Hallazgos clínicos' },
  { clave: 'plan', titulo: 'Conducta e indicaciones' },
  { clave: 'familySummary', titulo: 'Resumen para la familia', ayuda: 'Es lo que la familia ve en el portal, tal cual.' },
  { clave: 'allergiesMedication', titulo: 'Alergias y medicación' },
];

const fechaHora = (iso?: string) => (iso ? `${fechaCorta(iso)} ${hora(iso)}` : '');

export function NotaClinica({ consulta, paciente }: { consulta: Consultation; paciente: Patient }) {
  const { db, actualizar } = useApp();
  const [texto, setTexto] = useState(consulta.rawText);
  const pendiente = useAutoguardado(texto, (v) => actualizar('consultations', consulta.id, { rawText: v }, 'consulta.texto'));

  // Si desde otra pantalla se agregó texto (por ejemplo, el resumen de fiebre), traerlo.
  const ultimoGuardado = useRef(consulta.rawText);
  useEffect(() => {
    if (consulta.rawText !== ultimoGuardado.current && !pendiente) setTexto(consulta.rawText);
    ultimoGuardado.current = consulta.rawText;
  }, [consulta.rawText, pendiente]);

  const versiones = versionesDeNota(db, consulta.id);
  const vigente = notaVigente(db, consulta.id);

  return (
    <View style={{ gap: 16 }}>
      <Campo
        etiqueta="Texto original de la consulta"
        ayuda="Escribilo, pegalo o dictalo con el micrófono del teclado. Se guarda solo."
        value={texto}
        onChangeText={setTexto}
        multiline
        style={{ minHeight: 160 }}
        placeholder="Ej.: Tomás viene por 2 días de tos y fiebre de 38,5 °C…"
      />
      <EstadoGuardado pendiente={pendiente} />

      {!vigente ? (
        <SinNota consulta={consulta} paciente={paciente} texto={texto} />
      ) : vigente.status === 'borrador' ? (
        <Borrador key={vigente.id} nota={vigente} consulta={consulta} paciente={paciente} texto={texto} />
      ) : (
        <Aprobada nota={vigente} consulta={consulta} paciente={paciente} />
      )}

      {versiones.length > 0 ? <Historial versiones={versiones} /> : null}
    </View>
  );
}

// ---------- Sin nota todavía ----------

/** Explicación cuando la IA está apagada (prompt maestro 7.18: arranca apagada). */
const IA_APAGADA = 'La IA está apagada. Se enciende en Configuración, después de revisar el consentimiento informado para usar IA con datos de salud.';

interface Propuesta { id?: string; campos: CamposNota; motivoBandera: string; faltantes: string[]; ejemplo: boolean }

/** Pide a la IA el borrador de la evolución (la respuesta es una propuesta, nunca se guarda sola). */
function usePropuestaIA(consulta: Consultation, paciente: Patient, texto: string) {
  const { operaciones } = useApp();
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedir = async () => {
    if (!texto.trim()) return setError('Primero escribí, pegá o dictá el texto de la consulta.');
    setError(null); setPropuesta(null); setCargando(true);
    const r = await operaciones.pedirIA({ accion: 'preparar_evolucion', patientId: paciente.id, consultationId: consulta.id, texto });
    setCargando(false);
    if (r.error || !r.resultado) return setError(r.error ?? 'La IA no respondió.');
    const x = r.resultado;
    const t = (v: unknown) => (typeof v === 'string' ? v : '');
    setPropuesta({
      id: r.interaccionId, ejemplo: !!r.ejemplo,
      campos: { findings: t(x.hallazgos), plan: t(x.conducta), familySummary: t(x.resumenFamilia), allergiesMedication: t(x.alergiasMedicacion), clinicalFlag: x.banderaClinica === true },
      motivoBandera: t(x.motivoBandera),
      faltantes: Array.isArray(x.datosFaltantes) ? x.datosFaltantes.filter((y): y is string => typeof y === 'string') : [],
    });
  };
  const decidir = (aceptado: boolean) => {
    if (propuesta?.id) void operaciones.decidirIA(propuesta.id, aceptado);
    setPropuesta(null);
  };
  return { propuesta, cargando, error, pedir, decidir };
}

/** Vista previa de lo que propuso la IA: se usa o se descarta (queda registrado). */
function VistaPropuesta({ p, textoUsar, onUsar, onDescartar }: { p: Propuesta; textoUsar: string; onUsar: () => void; onDescartar: () => void }) {
  return (
    <View style={[s.tarjeta, { borderColor: colors.primary3 }]}>
      <Etiqueta texto={p.ejemplo ? 'Borrador de ejemplo (sin IA real)' : 'Propuesta de la IA'} tono="violeta" />
      {CAMPOS.map((c) => (
        <View key={c.clave} style={{ gap: 2 }}>
          <TextoFuerte>{c.titulo}</TextoFuerte>
          <Texto color={p.campos[c.clave] ? colors.text : colors.textMuted}>{p.campos[c.clave] || 'Sin datos en el texto.'}</Texto>
        </View>
      ))}
      {p.campos.clinicalFlag ? <Aviso tono="alerta" texto={`Propone bandera clínica${p.motivoBandera ? `: ${p.motivoBandera}` : '.'}`} /> : null}
      {p.faltantes.length ? <TextoChico>Faltan datos: {p.faltantes.join('; ')}.</TextoChico> : null}
      <TextoChico color={colors.textMuted}>Revisala: puede equivocarse. Nada se guarda en la historia hasta que lo apruebes.</TextoChico>
      <Boton titulo={textoUsar} icono="checkmark" onPress={onUsar} />
      <Boton titulo="Descartar" variante="contorno" onPress={onDescartar} />
    </View>
  );
}

function SinNota({ consulta, paciente, texto }: { consulta: Consultation; paciente: Patient; texto: string }) {
  const { agregar, db } = useApp();
  const ia = usePropuestaIA(consulta, paciente, texto);
  const crear = (campos: CamposNota, origin: ClinicalNote['origin']) =>
    agregar('notes', { consultationId: consulta.id, patientId: paciente.id, version: 1, status: 'borrador', origin, updatedAt: ahoraISO(), ...campos }, 'nota.crear');

  if (ia.propuesta) {
    return (
      <VistaPropuesta p={ia.propuesta} textoUsar="Usar como borrador"
        onUsar={() => { crear(ia.propuesta!.campos, 'ia'); ia.decidir(true); }} onDescartar={() => ia.decidir(false)} />
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Boton
        titulo={ia.cargando ? 'Preparando la evolución…' : 'Generar borrador con IA'}
        icono="sparkles-outline"
        variante={db.ia.enabled ? 'principal' : 'contorno'}
        deshabilitado={!db.ia.enabled || ia.cargando}
        detalle={db.ia.enabled ? undefined : IA_APAGADA}
        onPress={() => void ia.pedir()}
      />
      <Boton titulo="Escribir manualmente" icono="create-outline" variante={db.ia.enabled ? 'contorno' : 'principal'} onPress={() => crear(VACIA, 'humano')} />
      {ia.error ? <Aviso tono="alerta" texto={ia.error} /> : null}
    </View>
  );
}

// ---------- Borrador (editable) ----------

function Borrador({ nota, consulta, paciente, texto }: { nota: ClinicalNote; consulta: Consultation; paciente: Patient; texto: string }) {
  const { actualizar, operaciones, db } = useApp();
  const inicial: CamposNota = { findings: nota.findings, plan: nota.plan, familySummary: nota.familySummary, allergiesMedication: nota.allergiesMedication, clinicalFlag: nota.clinicalFlag };
  const [campos, setCampos] = useState<CamposNota>(inicial);
  const [origen, setOrigen] = useState(nota.origin);
  const [confirmarRegenerar, setConfirmarRegenerar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const sinGuardar = JSON.stringify(campos) !== JSON.stringify(inicial) || origen !== nota.origin;

  useEffect(() => {
    if (!confirmarRegenerar) return;
    const t = setTimeout(() => setConfirmarRegenerar(false), 5000);
    return () => clearTimeout(t);
  }, [confirmarRegenerar]);

  const ia = usePropuestaIA(consulta, paciente, texto);
  const regenerar = () => {
    // Si ya hay contenido, se pide confirmación antes de pedir otra propuesta.
    const tieneContenido = CAMPOS.some((c) => campos[c.clave].trim());
    if (tieneContenido && !confirmarRegenerar) return setConfirmarRegenerar(true);
    setConfirmarRegenerar(false);
    setAviso(null);
    void ia.pedir();
  };
  const usarPropuesta = () => {
    const b = ia.propuesta!.campos;
    // Reemplaza los cuatro campos; la bandera que marcó el médico no se apaga.
    setCampos((x) => ({ ...b, clinicalFlag: x.clinicalFlag || b.clinicalFlag }));
    setOrigen('ia');
    ia.decidir(true);
  };

  const guardar = () => {
    actualizar('notes', nota.id, { ...campos, origin: origen, updatedAt: ahoraISO() }, 'nota.guardar');
    setAviso('Borrador guardado. Podés seguir después.');
  };

  const aprobar = () => {
    if (!campos.familySummary.trim() && !campos.findings.trim() && !campos.plan.trim()) {
      return setAviso('La nota está vacía. Completá al menos un campo antes de aprobar.');
    }
    // Aprobar lo hace el servidor: fija la versión y, si tiene bandera, crea el seguimiento.
    operaciones.aprobarNota({ nota, consulta, campos, origen }).then((error) => { if (error) setAviso(error); });
  };

  return (
    <View style={s.tarjeta}>
      <View style={s.encabezado}>
        <Etiqueta texto={`Borrador · v${nota.version}`} tono="neutro" />
        {sinGuardar ? <TextoChico color={colors.primary2}>Cambios sin guardar</TextoChico> : null}
      </View>
      {origen === 'ia' ? (
        <Aviso icono="sparkles-outline" texto="Borrador propuesto por la IA. Revisá y corregí antes de aprobar." />
      ) : null}
      {ia.propuesta ? <VistaPropuesta p={ia.propuesta} textoUsar="Reemplazar los 4 campos" onUsar={usarPropuesta} onDescartar={() => ia.decidir(false)} /> : null}
      {ia.error ? <Aviso tono="alerta" texto={ia.error} /> : null}

      {CAMPOS.map((c) => (
        <Campo
          key={c.clave}
          etiqueta={c.titulo}
          ayuda={c.ayuda}
          value={campos[c.clave]}
          onChangeText={(v) => setCampos((x) => ({ ...x, [c.clave]: v }))}
          multiline
          style={{ minHeight: c.clave === 'familySummary' ? 130 : 100 }}
        />
      ))}
      <Casilla marcada={campos.clinicalFlag} onCambio={(v) => setCampos((x) => ({ ...x, clinicalFlag: v }))} texto="Marcar bandera clínica" detalle="Al aprobar, entra en Seguimientos pendientes." />

      {db.ia.enabled ? (
        <Boton
          titulo={ia.cargando ? 'Preparando la evolución…' : confirmarRegenerar ? 'Tocá de nuevo para pedir otra propuesta' : 'Volver a generar con IA'}
          icono="refresh-outline"
          variante={confirmarRegenerar ? 'alerta' : 'contorno'}
          deshabilitado={ia.cargando}
          onPress={regenerar}
        />
      ) : null}
      {aviso ? <Aviso texto={aviso} /> : null}
      <Boton titulo="Guardar cambios" icono="save-outline" variante="secundario" onPress={guardar} />
      <Boton titulo="Aprobar y guardar en historia clínica" icono="checkmark-done-outline" onPress={aprobar} />
      <TextoChico>Al aprobar, esta versión queda fija. Cualquier corrección posterior se guarda como una versión nueva.</TextoChico>
    </View>
  );
}

// ---------- Aprobada (solo lectura) ----------

function Aprobada({ nota, consulta, paciente }: { nota: ClinicalNote; consulta: Consultation; paciente: Patient }) {
  const { operaciones } = useApp();
  const [error, setError] = useState<string | null>(null);
  // Corregir lo hace el servidor: la aprobada queda "reemplazada" y nace la versión siguiente.
  const corregir = () => { operaciones.corregirNota(nota).then(setError); };

  return (
    <View style={s.tarjeta}>
      <View style={s.encabezado}>
        <Etiqueta texto={`Aprobada · v${nota.version} · ${fechaHora(nota.approvedAt)}`} tono="azul" />
        {nota.clinicalFlag ? <Etiqueta texto="Bandera clínica" tono="alerta" /> : null}
      </View>
      <VistaCampos nota={nota} />
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      <Boton titulo="Corregir esta nota" icono="create-outline" variante="contorno" onPress={corregir} />
      <ResumenParaFamilia nota={nota} consulta={consulta} paciente={paciente} />
    </View>
  );
}

// ---------- Resumen para la familia por mail ----------

/**
 * "Preparar el mail" → lo revisás y lo podés cambiar → "Revisé y lo mando".
 * Lleva solo el resumen para la familia. El envío lo hace Make (evento `resumen.envio_aprobado`).
 */
function ResumenParaFamilia({ nota, consulta, paciente }: { nota: ClinicalNote; consulta: Consultation; paciente: Patient }) {
  const { db, operaciones } = useApp();
  const [abierto, setAbierto] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [mandando, setMandando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: 'info' | 'alerta'; texto: string } | null>(null);
  const destinatarios = adultosDe(db, paciente.id).map((a) => a.guardian).filter((g) => g.email.trim());
  const enviados = db.communications.filter((c) => c.noteId === nota.id && c.kind === 'resumen_familia').sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!nota.familySummary.trim()) {
    return <TextoChico>Esta versión no tiene resumen para la familia: no hay mail para preparar.</TextoChico>;
  }

  const preparar = () => {
    const m = mailDelResumen({
      nombresAdultos: destinatarios.map((g) => g.firstName),
      nombreChico: paciente.firstName,
      fecha: fechaCorta(consulta.occurredAt),
      resumen: nota.familySummary,
    });
    setAsunto(m.asunto);
    setCuerpo(m.texto);
    setMensaje(null);
    setAbierto(true);
  };

  const mandar = async () => {
    setMandando(true);
    const error = await operaciones.enviarResumen({ nota, asunto, texto: cuerpo });
    setMandando(false);
    if (error) return setMensaje({ tono: 'alerta', texto: error });
    setAbierto(false);
    setMensaje({ tono: 'info', texto: 'Listo: quedó registrado y lo manda Make. Hasta que Make esté conectado (Etapa 8), no sale ningún mail.' });
  };

  return (
    <View style={s.mail}>
      <TextoFuerte>Resumen para la familia por mail</TextoFuerte>
      {enviados.map((c) => <TextoChico key={c.id}>Enviado a Make el {fechaHora(c.createdAt)} ({(c.recipientIds ?? []).length} {(c.recipientIds ?? []).length === 1 ? 'destinatario' : 'destinatarios'}).</TextoChico>)}
      {!abierto ? (
        <Boton titulo={enviados.length > 0 ? 'Preparar otro mail' : 'Preparar el mail'} icono="mail-outline" variante="secundario" onPress={preparar} />
      ) : (
        <>
          <TextoChico>
            Para: {destinatarios.length > 0 ? destinatarios.map((g) => `${g.firstName} ${g.lastName} (${g.email})`).join(', ') : 'ningún adulto tiene email cargado'}
          </TextoChico>
          <Campo etiqueta="Asunto" value={asunto} onChangeText={setAsunto} maxLength={200} />
          <Campo etiqueta="Texto" value={cuerpo} onChangeText={setCuerpo} multiline maxLength={5000} style={{ minHeight: 220 }} ayuda="Lleva solo el resumen para la familia. Revisalo y cambiá lo que quieras antes de mandarlo." />
          <Boton titulo={mandando ? 'Mandando…' : 'Revisé y lo mando'} icono="send-outline" deshabilitado={mandando || !asunto.trim() || !cuerpo.trim() || destinatarios.length === 0} onPress={mandar} />
          <Boton titulo="No mandar" variante="contorno" onPress={() => setAbierto(false)} />
        </>
      )}
      {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} /> : null}
    </View>
  );
}

function VistaCampos({ nota }: { nota: ClinicalNote }) {
  return (
    <View style={{ gap: 12 }}>
      {CAMPOS.map((c) => (
        <View key={c.clave} style={{ gap: 2 }}>
          <TextoChico>{c.titulo}</TextoChico>
          <Texto>{nota[c.clave].trim() || '—'}</Texto>
        </View>
      ))}
    </View>
  );
}

// ---------- Historial ----------

const TONO: Record<ClinicalNote['status'], 'celeste' | 'azul' | 'neutro'> = { borrador: 'neutro', aprobada: 'azul', reemplazada: 'celeste' };
const TEXTO_ESTADO: Record<ClinicalNote['status'], string> = { borrador: 'Borrador', aprobada: 'Aprobada', reemplazada: 'Reemplazada' };

function Historial({ versiones }: { versiones: ClinicalNote[] }) {
  const [abierto, setAbierto] = useState(false);
  const [verId, setVerId] = useState<string | null>(null);
  return (
    <View style={{ gap: 10 }}>
      <Pressable onPress={() => setAbierto(!abierto)} accessibilityRole="button" style={s.historialBoton}>
        <Ionicons name={abierto ? 'chevron-down' : 'chevron-forward'} size={20} color={colors.primary2} />
        <TextoFuerte color={colors.primary2}>Historial de versiones ({versiones.length})</TextoFuerte>
      </Pressable>
      {abierto
        ? [...versiones].reverse().map((v) => (
            <View key={v.id} style={s.version}>
              <Pressable onPress={() => setVerId(verId === v.id ? null : v.id)} accessibilityRole="button" style={{ gap: 4 }}>
                <View style={s.encabezado}>
                  <TextoFuerte>v{v.version}</TextoFuerte>
                  <Etiqueta texto={TEXTO_ESTADO[v.status]} tono={TONO[v.status]} />
                  {v.origin === 'ia' ? <Etiqueta texto="Origen: IA" tono="neutro" /> : null}
                </View>
                <TextoChico>
                  Creada {fechaHora(v.createdAt)}{v.approvedAt ? ` · aprobada ${fechaHora(v.approvedAt)}` : ''}
                </TextoChico>
              </Pressable>
              {verId === v.id ? <VistaCampos nota={v} /> : null}
            </View>
          ))
        : null}
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: { gap: 14, backgroundColor: colors.white, borderRadius: size.radius, borderWidth: 1, borderColor: colors.border, padding: 16 },
  encabezado: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  mail: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  historialBoton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  version: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
});

