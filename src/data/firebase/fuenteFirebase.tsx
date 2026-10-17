/**
 * Fuente de datos Firebase: ingreso real del equipo y datos en Firestore.
 * - Lee con suscripciones en vivo: las colecciones administrativas de la organización y lo
 *   clínico de todos los pacientes por grupo de colecciones (las reglas lo permiten solo al médico).
 * - Escribe con la firma que exigen las reglas (organizationId, createdBy, updatedBy). La
 *   auditoría la registra el servidor.
 * - Lo crítico (alta de pacientes, aprobar y corregir notas, emitir y anular certificados) va
 *   por Cloud Functions.
 * El portal de las familias se conecta en la Etapa 6 (copias filtradas que arma el servidor).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection, collectionGroup, deleteField, doc, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import type { AppState, ResultadoTurno, Sesion, Tabla } from '../contrato';
import type { Appointment, AppointmentChange, Communication, Database } from '../types';
import { CONFIG_AGENDA_INICIAL } from '@shared/agenda';
import { firebase } from './config';
import { ADMINISTRATIVAS, CLINICAS, aFirestore, coleccion, desdeFirestore, diferencias, ruta } from './mapeo';
import { ahoraISO } from '@/lib/fechas';
import { FIRMA } from '@/lib/certificados';

const VACIA: Database = {
  doctor: { id: '', name: 'Dr. Alan Hughes', email: '', signature: FIRMA },
  families: [], guardians: [], relationships: [], addresses: [], patients: [], memberships: [], payments: [],
  backgrounds: [], problems: [], allergies: [], consultations: [], measurements: [], milestoneChecks: [], notes: [], followUps: [],
  carePlan: [], vaccineDoses: [], medications: [], prescriptions: [], studies: [], fever: [], certificates: [], documents: [], appointments: [], appointmentHistory: [], blocks: [], communications: [],
  agenda: CONFIG_AGENDA_INICIAL, ia: { enabled: false }, vacunas: { calendarioVerificado: false }, auditLog: [],
};

/** Mensajes que se entienden, sin códigos técnicos. */
export function mensajeDeError(e: unknown): string {
  const code = e instanceof FirebaseError ? e.code : '';
  if (code.endsWith('permission-denied')) return 'No tenés permiso para hacer este cambio.';
  if (code.endsWith('unavailable') || code.endsWith('network-request-failed')) return 'No hay conexión con el servidor. Revisá la conexión (en desarrollo: ¿están corriendo los emuladores?).';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email') return 'El email o la contraseña no son correctos.';
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
  // El SDK le agrega el código HTTP al final (" [400]"): no sirve para el Dr.
  if (e instanceof FirebaseError && code.startsWith('functions/') && e.message) return e.message.replace(/\s*\[\d{3}\]$/, '');
  return 'No se pudo guardar. Probá de nuevo.';
}

export function useFuenteFirebase(): AppState {
  const { auth, db: fs, functions } = firebase();
  const [listo, setListo] = useState(false);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [org, setOrg] = useState<string | null>(null);
  const [datos, setDatos] = useState<Database>(VACIA);
  const [error, setError] = useState<string | null>(null);
  const uid = sesion?.usuarioId ?? '';

  // Sesión: rol y organización salen de los custom claims (los asigna solo el servidor).
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (!u) { setSesion(null); setOrg(null); setDatos(VACIA); setListo(true); return; }
    const { claims } = await u.getIdTokenResult();
    if (claims.rol === 'medico' && typeof claims.organizationId === 'string') {
      setSesion({ rol: 'medico', usuarioId: u.uid });
      setOrg(claims.organizationId);
    } else {
      // Asistente (todavía sin pantallas) o familia (portal en la Etapa 6): no entra a esta app aún.
      await signOut(auth);
      setError(claims.rol === 'asistente'
        ? 'El acceso del asistente llega más adelante.'
        : 'Por ahora el ingreso es solo para el médico. El portal de las familias se conecta en la Etapa 6.');
    }
    setListo(true);
  }), [auth]);

  // Suscripciones en vivo a los datos de la organización.
  useEffect(() => {
    if (!org) return;
    const subs: Unsubscribe[] = [];
    const poner = (tabla: Tabla) => (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) =>
      setDatos((d) => ({ ...d, [tabla]: snap.docs.map((x) => desdeFirestore(tabla, x.id, x.data())) }));
    const fallo = (e: unknown) => setError(mensajeDeError(e));

    for (const tabla of ADMINISTRATIVAS) {
      subs.push(onSnapshot(collection(fs, `organizations/${org}/${tabla}`), poner(tabla), fallo));
    }
    // Lo clínico y los domicilios, de todos los pacientes y adultos (por grupo de colecciones).
    // Las copias del portal (Etapa 6) no llevan organizationId, así que no se mezclan acá.
    for (const tabla of ['addresses', ...Object.keys(CLINICAS)] as Tabla[]) {
      subs.push(onSnapshot(query(collectionGroup(fs, coleccion(tabla)), where('organizationId', '==', org)), poner(tabla), fallo));
    }
    // Agenda: los turnos y su historial los escribe solo el servidor; acá se leen.
    subs.push(onSnapshot(collection(fs, `organizations/${org}/appointments`), (snap) => {
      setDatos((d) => ({ ...d, appointments: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as Appointment) }));
    }, fallo));
    subs.push(onSnapshot(query(collectionGroup(fs, 'history'), where('organizationId', '==', org), orderBy('atMs')), (snap) => {
      setDatos((d) => ({ ...d, appointmentHistory: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as AppointmentChange) }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/agenda`), (snap) => {
      const a = snap.data() ?? {};
      setDatos((d) => ({ ...d, agenda: { ...CONFIG_AGENDA_INICIAL, ...a, duracionMin: { ...CONFIG_AGENDA_INICIAL.duracionMin, ...(a.duracionMin ?? {}) } } }));
    }, fallo));
    subs.push(onSnapshot(collection(fs, `organizations/${org}/communications`), (snap) => {
      setDatos((d) => ({ ...d, communications: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as Communication) }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/vacunas`), (snap) => {
      setDatos((d) => ({ ...d, vacunas: { calendarioVerificado: snap.data()?.calendarioVerificado === true } }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/ia`), (snap) => {
      setDatos((d) => ({ ...d, ia: { enabled: snap.data()?.enabled === true } }));
    }, fallo));
    subs.push(onSnapshot(collection(fs, `organizations/${org}/professionals`), (snap) => {
      const p = snap.docs[0];
      if (p) setDatos((d) => ({ ...d, doctor: { id: uid, name: String(p.data().name ?? d.doctor.name), email: '', signature: String(p.data().signature ?? FIRMA) } }));
    }, fallo));
    return () => subs.forEach((u) => u());
  }, [fs, org, uid]);

  const fallo = useCallback((e: unknown) => setError(mensajeDeError(e)), []);
  const firmaNueva = useCallback(() => {
    const ahora = ahoraISO();
    return { organizationId: org, createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora };
  }, [org, uid]);
  /** Cambios de la app → actualización de Firestore (undefined borra el campo). */
  const cambiosFirestore = useCallback((tabla: Tabla, cambios: Record<string, unknown>) => {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(cambios)) {
      if (k === 'id') continue;
      const nombre = Object.keys(aFirestore(tabla, { [k]: true }))[0] ?? k;
      salida[nombre] = v === undefined ? deleteField() : v;
    }
    return { ...salida, updatedBy: uid, updatedAt: ahoraISO() };
  }, [uid]);

  const agregar = useCallback<AppState['agregar']>((tabla, fila) => {
    if (!org) return '';
    const id = fila.id ?? doc(collection(fs, '_')).id;
    const completa: Record<string, unknown> = { ...fila, id };
    if (tabla === 'fever') completa.origin = 'medico';
    setDoc(doc(fs, ruta(org, tabla, completa as { id: string })), { ...aFirestore(tabla, completa), ...firmaNueva() }).catch(fallo);
    return id;
  }, [fs, org, firmaNueva, fallo]);

  const actualizar = useCallback<AppState['actualizar']>((tabla, id, cambios) => {
    if (!org) return;
    const fila = (datos[tabla] as { id: string }[]).find((f) => f.id === id);
    if (!fila) return setError('No encontramos ese dato para guardarlo.');
    updateDoc(doc(fs, ruta(org, tabla, fila)), cambiosFirestore(tabla, cambios as Record<string, unknown>)).catch(fallo);
  }, [fs, org, datos, cambiosFirestore, fallo]);

  const enLote = useCallback<AppState['enLote']>((fn) => {
    if (!org) return;
    const despues = fn(datos, { ahora: ahoraISO(), usuarioId: uid, log: () => {} });
    const lote = writeBatch(fs);
    for (const c of diferencias(datos, despues)) {
      const ref = doc(fs, ruta(org, c.tabla, c.fila));
      if (c.tipo === 'crear') lote.set(ref, { ...aFirestore(c.tabla, c.fila), ...firmaNueva() });
      else lote.update(ref, cambiosFirestore(c.tabla, c.cambios!));
    }
    lote.commit().catch(fallo);
  }, [fs, org, uid, datos, firmaNueva, cambiosFirestore, fallo]);

  const operaciones = useMemo<AppState['operaciones']>(() => {
    const llamar = async (nombre: string, datosLlamada: unknown) => {
      try { await httpsCallable(functions, nombre)(datosLlamada); return null; } catch (e) { return mensajeDeError(e); }
    };
    const turno = async (nombre: string, datosLlamada: unknown): Promise<ResultadoTurno> => {
      try {
        const r = await httpsCallable<unknown, ResultadoTurno>(functions, nombre)(datosLlamada);
        return r.data;
      } catch (e) {
        return { estado: 'error', mensaje: mensajeDeError(e) };
      }
    };
    return {
      crearPaciente: async (p, confirmar) => {
        try {
          const r = await httpsCallable<unknown, { estado: string; id?: string }>(functions, 'crearPaciente')({ ...p, confirmarPosibleDuplicado: confirmar });
          return r.data.estado === 'creado' ? { estado: 'creado', id: r.data.id! } : { estado: 'posible-duplicado' };
        } catch (e) {
          return { estado: 'error', mensaje: mensajeDeError(e) };
        }
      },
      aprobarNota: ({ nota, campos, origen }) => llamar('aprobarNota', { patientId: nota.patientId, noteId: nota.id, campos: { ...campos, origin: origen } }),
      corregirNota: (nota) => llamar('corregirNota', { patientId: nota.patientId, noteId: nota.id }),
      emitirCertificado: ({ titulo: _titulo, ...d }) => llamar('emitirCertificado', d),
      anularCertificado: (c, motivo) => llamar('anularCertificado', { patientId: c.patientId, certificateId: c.id, reason: motivo }),
      crearTurno: (datos) => turno('crearTurno', datos),
      accionTurno: ({ turno: t, ...resto }) => turno('accionTurno', { id: t.id, ...resto }),
      verificarCalendario: async (verificado) => {
        // settings/vacunas lo puede escribir solo el médico, con su firma (reglas).
        const ref = doc(fs, `organizations/${org}/settings/vacunas`);
        const ahora = ahoraISO();
        const datosCalendario = { calendarioVerificado: verificado, verifiedAt: verificado ? ahora : deleteField(), verifiedBy: verificado ? uid : deleteField(), updatedBy: uid, updatedAt: ahora };
        try {
          await updateDoc(ref, datosCalendario);
          return null;
        } catch (e) {
          if (!(e instanceof FirebaseError && e.code === 'not-found')) return mensajeDeError(e);
          try {
            await setDoc(ref, { calendarioVerificado: verificado, ...(verificado ? { verifiedAt: ahora, verifiedBy: uid } : {}), organizationId: org, createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora });
            return null;
          } catch (e2) { return mensajeDeError(e2); }
        }
      },
      enviarResumen: ({ nota, asunto, texto }) => llamar('enviarResumenFamilia', { patientId: nota.patientId, noteId: nota.id, asunto, texto }),
    };
  }, [functions, fs, org, uid]);

  return useMemo<AppState>(() => ({
    fuente: 'firebase',
    listo,
    db: datos,
    sesion,
    usuarioId: uid,
    error,
    limpiarError: () => setError(null),
    ingresar: async (email, clave) => {
      try { await signInWithEmailAndPassword(auth, email.trim(), clave); setError(null); return null; } catch (e) { return mensajeDeError(e); }
    },
    entrarComoMedico: () => {},
    entrarComoAdulto: () => {},
    pedirEnlaceEmail: () => null,
    entrarConEnlace: () => ({ ok: false, motivo: 'invalido' }),
    salir: () => { signOut(auth).catch(fallo); },
    agregar,
    actualizar,
    enLote,
    operaciones,
  }), [listo, datos, sesion, uid, error, auth, agregar, actualizar, enLote, operaciones, fallo]);
}
