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
import { useApp, nuevoId } from '@/data/store';
import { versionesDeNota, notaVigente, mensajeDeSeguimiento, horasDeSeguimiento } from '@/data/selectores';
import type { ClinicalNote, Consultation, Patient, FollowUp } from '@/data/types';
import { borradorDeEjemplo, type CamposNota } from '@/lib/notaIA';
import { ahoraISO, fechaCorta, hora, sumarHoras } from '@/lib/fechas';
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
        <Aprobada nota={vigente} />
      )}

      {versiones.length > 0 ? <Historial versiones={versiones} /> : null}
    </View>
  );
}

// ---------- Sin nota todavía ----------

function SinNota({ consulta, paciente, texto }: { consulta: Consultation; paciente: Patient; texto: string }) {
  const { agregar } = useApp();
  const [sinTexto, setSinTexto] = useState(false);
  const crear = (campos: CamposNota, origin: ClinicalNote['origin']) =>
    agregar('notes', { consultationId: consulta.id, patientId: paciente.id, version: 1, status: 'borrador', origin, updatedAt: ahoraISO(), ...campos }, 'nota.crear');

  return (
    <View style={{ gap: 10 }}>
      <Boton
        titulo="Generar borrador con IA"
        icono="sparkles-outline"
        onPress={() => {
          const b = borradorDeEjemplo(texto, consulta.visitType, paciente.firstName);
          if (!b) return setSinTexto(true);
          crear(b, 'ia');
        }}
      />
      <Boton titulo="Escribir manualmente" icono="create-outline" variante="contorno" onPress={() => crear(VACIA, 'humano')} />
      {sinTexto ? <Aviso tono="alerta" texto="Primero escribí, pegá o dictá el texto de la consulta." /> : null}
    </View>
  );
}

// ---------- Borrador (editable) ----------

function Borrador({ nota, consulta, paciente, texto }: { nota: ClinicalNote; consulta: Consultation; paciente: Patient; texto: string }) {
  const { actualizar, enLote } = useApp();
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

  const regenerar = () => {
    const tieneContenido = CAMPOS.some((c) => campos[c.clave].trim());
    if (tieneContenido && !confirmarRegenerar) return setConfirmarRegenerar(true);
    const b = borradorDeEjemplo(texto, consulta.visitType, paciente.firstName);
    setConfirmarRegenerar(false);
    if (!b) return setAviso('Primero escribí, pegá o dictá el texto de la consulta.');
    // Reemplaza los cuatro campos; la bandera que marcó el médico no se apaga.
    setCampos((x) => ({ ...b, clinicalFlag: x.clinicalFlag || b.clinicalFlag }));
    setOrigen('ia');
    setAviso(null);
  };

  const guardar = () => {
    actualizar('notes', nota.id, { ...campos, origin: origen, updatedAt: ahoraISO() }, 'nota.guardar');
    setAviso('Borrador guardado. Podés seguir después.');
  };

  const aprobar = () => {
    if (!campos.familySummary.trim() && !campos.findings.trim() && !campos.plan.trim()) {
      return setAviso('La nota está vacía. Completá al menos un campo antes de aprobar.');
    }
    enLote((d, { ahora, usuarioId, log }) => {
      const aprobada: ClinicalNote = { ...nota, ...campos, origin: origen, status: 'aprobada', updatedAt: ahora, approvedAt: ahora, approvedBy: usuarioId };
      let followUps = d.followUps;
      if (aprobada.clinicalFlag) {
        const existente = d.followUps.find((f) => f.consultationId === consulta.id && f.status === 'pendiente');
        const datos = {
          noteId: aprobada.id,
          dueAt: sumarHoras(consulta.occurredAt, horasDeSeguimiento(consulta.visitType)),
          message: mensajeDeSeguimiento(d, aprobada),
        };
        if (existente) {
          followUps = d.followUps.map((f) => (f.id === existente.id ? { ...f, ...datos } : f));
        } else {
          const nuevo: FollowUp = { id: nuevoId('fu'), createdAt: ahora, createdBy: usuarioId, consultationId: consulta.id, patientId: paciente.id, status: 'pendiente', ...datos };
          followUps = [...d.followUps, nuevo];
          log({ action: 'seguimiento.crear', entity: 'followUps', entityId: nuevo.id });
        }
      }
      log({ action: 'nota.aprobar', entity: 'notes', entityId: nota.id, detail: `v${nota.version}` });
      return {
        ...d,
        notes: d.notes.map((n) => (n.id === nota.id ? aprobada : n)),
        consultations: d.consultations.map((c) => (c.id === consulta.id ? { ...c, status: 'realizada' } : c)),
        followUps,
      };
    });
  };

  return (
    <View style={s.tarjeta}>
      <View style={s.encabezado}>
        <Etiqueta texto={`Borrador · v${nota.version}`} tono="neutro" />
        {sinGuardar ? <TextoChico color={colors.primary2}>Cambios sin guardar</TextoChico> : null}
      </View>
      {origen === 'ia' ? (
        <Aviso icono="sparkles-outline" texto="Borrador de ejemplo: todavía no hay IA conectada (llega con el backend). Revisá y corregí antes de aprobar." />
      ) : null}

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

      <Boton
        titulo={confirmarRegenerar ? 'Tocá de nuevo para reemplazar los 4 campos' : 'Volver a generar con IA'}
        icono="refresh-outline"
        variante={confirmarRegenerar ? 'alerta' : 'contorno'}
        onPress={regenerar}
      />
      {aviso ? <Aviso texto={aviso} /> : null}
      <Boton titulo="Guardar cambios" icono="save-outline" variante="secundario" onPress={guardar} />
      <Boton titulo="Aprobar y guardar en historia clínica" icono="checkmark-done-outline" onPress={aprobar} />
      <TextoChico>Al aprobar, esta versión queda fija. Cualquier corrección posterior se guarda como una versión nueva.</TextoChico>
    </View>
  );
}

// ---------- Aprobada (solo lectura) ----------

function Aprobada({ nota }: { nota: ClinicalNote }) {
  const { enLote } = useApp();
  const corregir = () =>
    enLote((d, { ahora, usuarioId, log }) => {
      const nueva: ClinicalNote = {
        ...nota,
        id: nuevoId('n'),
        version: nota.version + 1,
        previousVersionId: nota.id,
        status: 'borrador',
        origin: 'humano',
        createdAt: ahora,
        createdBy: usuarioId,
        updatedAt: ahora,
        approvedAt: undefined,
        approvedBy: undefined,
      };
      log({ action: 'nota.corregir', entity: 'notes', entityId: nota.id, detail: `v${nota.version} → v${nueva.version}` });
      return { ...d, notes: [...d.notes.map((n) => (n.id === nota.id ? { ...n, status: 'reemplazada' as const } : n)), nueva] };
    });

  return (
    <View style={s.tarjeta}>
      <View style={s.encabezado}>
        <Etiqueta texto={`Aprobada · v${nota.version} · ${fechaHora(nota.approvedAt)}`} tono="azul" />
        {nota.clinicalFlag ? <Etiqueta texto="Bandera clínica" tono="alerta" /> : null}
      </View>
      <VistaCampos nota={nota} />
      <Boton titulo="Corregir esta nota" icono="create-outline" variante="contorno" onPress={corregir} />
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
  historialBoton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  version: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
});

