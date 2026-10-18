/**
 * Fuente de datos Firebase.
 * - Médico: ingreso con email y contraseña; lee con suscripciones en vivo las colecciones de la
 *   organización y lo clínico de todos los pacientes (por grupo de colecciones).
 * - Familia (Etapa 6b): entra con el enlace mágico (token del servidor) y lee SOLO las copias
 *   filtradas del portal (`portal/{paciente}/{sub}`), que se arman con `portalFamilia.ts` en la misma
 *   forma que usan las pantallas. Escribe su fiebre, su contacto y sus direcciones; pedir visitas y
 *   bajar archivos pasa por el servidor.
 * - Escribe con la firma que exigen las reglas (organizationId, createdBy, updatedBy). La
 *   auditoría la registra el servidor. Lo crítico va por Cloud Functions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, signOut, type MultiFactorResolver, type TotpSecret } from 'firebase/auth';
import {
  collection, collectionGroup, deleteField, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getBytes, ref as refArchivo, uploadBytes } from 'firebase/storage';
import * as WebBrowser from 'expo-web-browser';
import { mostrarBytes, nombreSeguro, problemaDelArchivo, tipoPorNombre } from '@/lib/archivos';
import { FirebaseError } from 'firebase/app';
import type { AppState, ResultadoTurno, Sesion, Tabla } from '../contrato';
import type { Address, AppNotification, Appointment, AppointmentChange, AuditLog, Communication, Database, Guardian, InteraccionIA, MaterialDelivery, PlantillasCertificado } from '../types';
import { armarVistaFamilia, type CopiasPaciente } from './portalFamilia';
import { CONFIG_AGENDA_INICIAL } from '@shared/agenda';
import { EMULADORES, firebase } from './config';
import { confirmarAlta, factoresDe, ingresarConCodigo, pideSegundoFactor, prepararAlta } from './segundoFactor';
import { codigoValido, mensajeSegundoFactor } from '@/lib/segundoFactor';
import { ADMINISTRATIVAS, CLINICAS, aFirestore, coleccion, desdeFirestore, diferencias, ruta } from './mapeo';
import { ahoraISO } from '@/lib/fechas';
import { FIRMA } from '@/lib/certificados';
import { conLinks, conPrecios, LINKS_INICIALES, PRECIOS_INICIALES } from '../configuracion';
import { TEXTO_AMBITO } from '@/lib/busqueda';

/** Copias del portal que lee la familia, por chico (ver functions/src/portal/proyeccion.ts). */
const SUBS_PORTAL = ['datos', 'summaries', 'allergies', 'problems', 'plan', 'growth', 'vaccines', 'certificates', 'fever', 'turnos'];

/** Adulto tal como lo usa la app (en Firestore el acceso se llama portalEnabled). */
const adultoDesde = (id: string, d: Record<string, unknown>) => desdeFirestore('guardians', id, d) as unknown as Guardian;

const VACIA: Database = {
  doctor: { id: '', name: 'Dr. Alan Hughes', email: '', signature: FIRMA },
  families: [], guardians: [], relationships: [], addresses: [], patients: [], memberships: [], payments: [],
  backgrounds: [], problems: [], allergies: [], consultations: [], measurements: [], milestoneChecks: [], notes: [], followUps: [],
  carePlan: [], vaccineDoses: [], medications: [], prescriptions: [], studies: [], fever: [], certificates: [], documents: [], appointments: [], appointmentHistory: [], blocks: [], communications: [], educationalMaterials: [], materialDeliveries: [], notifications: [],
  agenda: CONFIG_AGENDA_INICIAL, ia: { enabled: false }, vacunas: { calendarioVerificado: false }, links: LINKS_INICIALES, precios: PRECIOS_INICIALES, ambitos: TEXTO_AMBITO, plantillas: {}, automatizaciones: { apagados: [] }, outbox: [], aiInteractions: [], interesados: [], admisiones: [], triage: [], transcripciones: [], auditLog: [],
};

/** Mensajes que se entienden, sin códigos técnicos. */
export function mensajeDeError(e: unknown): string {
  const code = e instanceof FirebaseError ? e.code : '';
  const segundoFactor = mensajeSegundoFactor(code);
  if (segundoFactor) return segundoFactor;
  if (code.endsWith('permission-denied')) return 'No tenés permiso para hacer este cambio.';
  if (code.endsWith('unavailable') || code.endsWith('network-request-failed')) return 'No hay conexión con el servidor. Revisá la conexión (en desarrollo: ¿están corriendo los emuladores?).';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email') return 'El email o la contraseña no son correctos.';
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
  // El SDK le agrega el código HTTP al final (" [400]"): no sirve para el Dr.
  if (e instanceof FirebaseError && code.startsWith('functions/') && e.message) return e.message.replace(/\s*\[\d{3}\]$/, '');
  return 'No se pudo guardar. Probá de nuevo.';
}

export function useFuenteFirebase(): AppState {
  const { auth, db: fs, functions, storage } = firebase();
  const [listo, setListo] = useState(false);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [org, setOrg] = useState<string | null>(null);
  const [datos, setDatos] = useState<Database>(VACIA);
  const [error, setError] = useState<string | null>(null);
  const uid = sesion?.usuarioId ?? '';

  // Familia: a qué chicos accede (portalAccess, lo mantiene el servidor), su adulto, sus direcciones y las copias.
  const [acceso, setAcceso] = useState<{ guardianId: string; patientIds: string[] } | null>(null);
  const [direcciones, setDirecciones] = useState<Address[]>([]);
  const [copias, setCopias] = useState<Record<string, CopiasPaciente>>({});
  const [linksFamilia, setLinksFamilia] = useState(LINKS_INICIALES);

  // Segundo factor (TOTP): el ingreso que espera el código y el alta en curso.
  const resolver = useRef<MultiFactorResolver | null>(null);
  const secretoAlta = useRef<TotpSecret | null>(null);
  const [segundoFactorPendiente, setSegundoFactorPendiente] = useState(false);
  const [factores, setFactores] = useState<{ nombre: string; desde: string }[]>([]);

  // Sesión: rol y organización salen de los custom claims (los asigna solo el servidor).
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setAcceso(null); setCopias({}); setDirecciones([]);
    if (!u) { setSesion(null); setOrg(null); setDatos(VACIA); setListo(true); return; }
    const { claims } = await u.getIdTokenResult();
    const orgId = typeof claims.organizationId === 'string' ? claims.organizationId : null;
    if (claims.rol === 'medico' && orgId) {
      setFactores(factoresDe(u));
      setSesion({ rol: 'medico', usuarioId: u.uid });
      setOrg(orgId);
    } else if (claims.rol === 'familia' && orgId) {
      try {
        const a = (await getDoc(doc(fs, `organizations/${orgId}/portalAccess/${u.uid}`))).data();
        if (!a?.enabled || typeof a.guardianId !== 'string') throw new Error('sin acceso');
        const g = await getDoc(doc(fs, `organizations/${orgId}/guardians/${a.guardianId}`));
        setAcceso({ guardianId: a.guardianId, patientIds: (a.patientIds ?? []) as string[] });
        setSesion({ rol: 'familia', usuarioId: u.uid, guardian: adultoDesde(g.id, g.data() ?? {}) });
        setOrg(orgId);
      } catch {
        await signOut(auth);
        setError('Tu acceso al portal no está habilitado. Escribile al Dr. por PacienteX.');
      }
    } else {
      // El asistente todavía no tiene pantallas.
      await signOut(auth);
      setError('El acceso del asistente llega más adelante.');
    }
    setListo(true);
  }), [auth, fs]);

  // Familia: suscripciones a su acceso, su adulto, sus direcciones y las copias de cada chico.
  const esFamilia = sesion?.rol === 'familia';
  const idsFamilia = acceso?.patientIds.join(',') ?? '';
  useEffect(() => {
    if (!org || !esFamilia || !acceso) return;
    const subs: Unsubscribe[] = [];
    const fallo = (e: unknown) => setError(mensajeDeError(e));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/portalAccess/${uid}`), (snap) => {
      const a = snap.data();
      if (!a?.enabled) { void signOut(auth); return; }
      setAcceso((x) => ({ guardianId: x?.guardianId ?? String(a.guardianId), patientIds: (a.patientIds ?? []) as string[] }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/guardians/${acceso.guardianId}`), (snap) => {
      const g = adultoDesde(snap.id, snap.data() ?? {});
      setSesion((x) => (x?.rol === 'familia' ? { ...x, guardian: g } : x));
    }, fallo));
    // Links de PacienteX y Cal.com (la familia puede leer solo este ajuste).
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/links`), (snap) => setLinksFamilia(conLinks(snap.data())), fallo));
    subs.push(onSnapshot(collection(fs, `organizations/${org}/guardians/${acceso.guardianId}/addresses`), (snap) => {
      setDirecciones(snap.docs.map((x) => desdeFirestore('addresses', x.id, x.data()) as unknown as Address));
    }, fallo));
    for (const pid of idsFamilia ? idsFamilia.split(',') : []) {
      for (const sub of SUBS_PORTAL) {
        subs.push(onSnapshot(collection(fs, `organizations/${org}/portal/${pid}/${sub}`), (snap) => {
          setCopias((c) => ({ ...c, [pid]: { ...c[pid], [sub]: snap.docs.map((x) => ({ id: x.id, datos: x.data() })) } }));
        }, fallo));
      }
    }
    return () => subs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, auth, org, esFamilia, acceso?.guardianId, idsFamilia, uid]);

  // Médico: suscripciones en vivo a los datos de la organización.
  useEffect(() => {
    if (!org || sesion?.rol !== 'medico') return;
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
    subs.push(onSnapshot(collection(fs, `organizations/${org}/materialDeliveries`), (snap) => {
      setDatos((d) => ({ ...d, materialDeliveries: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as MaterialDelivery) }));
    }, fallo));
    subs.push(onSnapshot(collection(fs, `organizations/${org}/communications`), (snap) => {
      setDatos((d) => ({ ...d, communications: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as Communication) }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/vacunas`), (snap) => {
      setDatos((d) => ({ ...d, vacunas: { calendarioVerificado: snap.data()?.calendarioVerificado === true } }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/links`), (snap) => {
      setDatos((d) => ({ ...d, links: conLinks(snap.data()) }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/ambitos`), (snap) => {
      setDatos((d) => ({ ...d, ambitos: { ...TEXTO_AMBITO, ...((snap.data()?.nombres ?? {}) as Record<string, string>) } }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/certificados`), (snap) => {
      setDatos((d) => ({ ...d, plantillas: (snap.data()?.plantillas ?? {}) as PlantillasCertificado }));
    }, fallo));
    // Lo que entra desde Make (Etapa 8b): interesados, formularios, triage y transcripciones de Plaud.
    for (const coleccion of ['interesados', 'admisiones', 'triage', 'transcripciones'] as const) {
      subs.push(onSnapshot(collection(fs, `organizations/${org}/${coleccion}`), (snap) => {
        setDatos((d) => ({ ...d, [coleccion]: snap.docs.map((x) => ({ id: x.id, ...x.data() })) }));
      }, fallo));
    }
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/automatizaciones`), (snap) => {
      const a = snap.data()?.apagados;
      setDatos((d) => ({ ...d, automatizaciones: { apagados: Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } }));
    }, fallo));
    subs.push(onSnapshot(query(collection(fs, `organizations/${org}/outbox`), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
      setDatos((d) => ({ ...d, outbox: snap.docs.map((x) => ({ id: x.id, type: String(x.data().type), status: x.data().status, createdAt: String(x.data().createdAt ?? ''), attempts: x.data().attempts, lastError: x.data().lastError ?? null })) }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/precios`), (snap) => {
      setDatos((d) => ({ ...d, precios: conPrecios(snap.data()) }));
    }, fallo));
    subs.push(onSnapshot(doc(fs, `organizations/${org}/settings/ia`), (snap) => {
      const ia = snap.data();
      setDatos((d) => ({ ...d, ia: { enabled: ia?.enabled === true, consentimientoRevisadoAt: typeof ia?.consentimientoRevisadoAt === 'string' ? ia.consentimientoRevisadoAt : undefined } }));
    }, fallo));
    subs.push(onSnapshot(query(collection(fs, `organizations/${org}/aiInteractions`), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setDatos((d) => ({ ...d, aiInteractions: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as InteraccionIA) }));
    }, fallo));
    // Avisos de la campana para el Dr. (por ejemplo, una familia cambió su contacto) y registro de accesos.
    subs.push(onSnapshot(query(collection(fs, `organizations/${org}/notifications`), where('recipientUid', '==', uid), where('readAt', '==', null)), (snap) => {
      setDatos((d) => ({ ...d, notifications: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as AppNotification) }));
    }, fallo));
    subs.push(onSnapshot(query(collection(fs, `organizations/${org}/auditLog`), where('action', '==', 'login')), (snap) => {
      setDatos((d) => ({ ...d, auditLog: snap.docs.map((x) => ({ id: x.id, ...x.data() }) as AuditLog) }));
    }, fallo));
    subs.push(onSnapshot(collection(fs, `organizations/${org}/professionals`), (snap) => {
      const p = snap.docs[0];
      const x = snap.docs.find((y) => y.id === uid)?.data() ?? p?.data();
      if (x) setDatos((d) => ({ ...d, doctor: { id: uid, name: String(x.name ?? d.doctor.name), email: '', signature: String(x.signature ?? FIRMA), mn: x.mn ? String(x.mn) : undefined, mp: x.mp ? String(x.mp) : undefined } }));
    }, fallo));
    return () => subs.forEach((u) => u());
  }, [fs, org, uid, sesion?.rol]);

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
    // La fiebre dice quién la cargó (las reglas lo exigen): el médico o la familia.
    if (tabla === 'fever') completa.origin = sesion?.rol === 'familia' ? 'familia' : 'medico';
    setDoc(doc(fs, ruta(org, tabla, completa as { id: string })), { ...aFirestore(tabla, completa), ...firmaNueva() }).catch(fallo);
    return id;
  }, [fs, org, firmaNueva, fallo, sesion?.rol]);

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
      enviarMaterial: ({ material, patientId }) => llamar('enviarMaterial', { materialId: material.id, patientId }),
      verificarCalendario: async (verificado) => {
        // settings/vacunas lo puede escribir solo el médico, con su firma (reglas).
        const ref = doc(fs, `organizations/${org}/settings/vacunas`);
        const ahora = ahoraISO();
        const datosCalendario = { calendarioVerificado: verificado, verifiedAt: verificado ? ahora : deleteField(), verifiedBy: verificado ? uid : deleteField(), updatedBy: uid, updatedAt: ahora };
        try {
          // Actualizar uno inexistente lo rechazan las reglas: si no existe, se crea con la firma completa.
          if ((await getDoc(ref)).exists()) await updateDoc(ref, datosCalendario);
          else await setDoc(ref, { calendarioVerificado: verificado, ...(verificado ? { verifiedAt: ahora, verifiedBy: uid } : {}), organizationId: org, createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      pedirIA: async (pedido) => {
        try {
          const r = await httpsCallable<unknown, { interaccionId: string; resultado: Record<string, unknown> }>(functions, 'iaAsistente')(pedido);
          return r.data;
        } catch (e) { return { error: mensajeDeError(e) }; }
      },
      decidirIA: (interaccionId, aceptado) => llamar('iaDecision', { interaccionId, aceptado }),
      registrarComunicacion: async (datos) => {
        if (!datos.subject.trim()) return 'Escribí el asunto (breve, sin datos clínicos).';
        try {
          const limpio = Object.fromEntries(Object.entries({ ...datos, subject: datos.subject.trim() }).filter(([, v]) => v !== undefined));
          await setDoc(doc(collection(fs, `organizations/${org}/communications`)), { ...limpio, kind: 'manual', status: 'registrado', ...firmaNueva() });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      actualizarEntrada: async (coleccion, id, cambios) => {
        try {
          const limpio = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
          await updateDoc(doc(fs, `organizations/${org}/${coleccion}/${id}`), { ...limpio, updatedBy: uid, updatedAt: ahoraISO() });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      guardarAjustes: async (ajuste) => {
        // settings/* y professionals/{uid}: solo el médico, con su firma (reglas). Se actualiza o se crea.
        const ref = ajuste.clave === 'profesional' ? doc(fs, `organizations/${org}/professionals/${uid}`) : doc(fs, `organizations/${org}/settings/${ajuste.clave}`);
        const datosAjuste = ajuste.clave === 'profesional'
          ? { name: ajuste.datos.name, signature: ajuste.datos.signature, mn: ajuste.datos.mn ?? '', mp: ajuste.datos.mp ?? '' }
          : ajuste.clave === 'ambitos' ? { nombres: ajuste.datos }
            : ajuste.clave === 'certificados' ? { plantillas: ajuste.datos }
              : ajuste.clave === 'automatizaciones' ? { apagados: ajuste.datos.apagados }
                : ajuste.clave === 'ia' ? { enabled: ajuste.datos.enabled, ...(ajuste.datos.consentimientoRevisadoAt ? { consentimientoRevisadoAt: ajuste.datos.consentimientoRevisadoAt } : {}) }
              : { ...ajuste.datos };
        const ahora = ahoraISO();
        try {
          // Si todavía no existe se crea con la firma completa (actualizar uno inexistente lo rechazan las reglas).
          if ((await getDoc(ref)).exists()) await updateDoc(ref, { ...datosAjuste, updatedBy: uid, updatedAt: ahora });
          else await setDoc(ref, { ...datosAjuste, organizationId: org, createdBy: uid, createdAt: ahora, updatedBy: uid, updatedAt: ahora });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      enviarResumen: ({ nota, asunto, texto }) => llamar('enviarResumenFamilia', { patientId: nota.patientId, noteId: nota.id, asunto, texto }),

      // ---- Familia ----
      pedirVisita: (pedido) => llamar('pedirVisita', pedido),
      actualizarMisDatos: async (cambios) => {
        if (!org || !acceso) return 'No hay sesión.';
        // Las reglas dejan cambiar solo el teléfono, el email y la preferencia, con su firma.
        const limpio = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
        try {
          await updateDoc(doc(fs, `organizations/${org}/guardians/${acceso.guardianId}`), { ...limpio, updatedBy: uid, updatedAt: ahoraISO() });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      guardarDireccion: async ({ id, ...dir }) => {
        if (!org || !acceso) return 'No hay sesión.';
        if (!dir.street.trim() || !dir.locality.trim()) return 'Escribí la calle y la localidad.';
        const coleccionDir = `organizations/${org}/guardians/${acceso.guardianId}/addresses`;
        const datosDir = { street: dir.street.trim(), locality: dir.locality.trim(), notes: dir.notes?.trim() ?? '' };
        try {
          if (id) await updateDoc(doc(fs, `${coleccionDir}/${id}`), { ...datosDir, updatedBy: uid, updatedAt: ahoraISO() });
          else await setDoc(doc(collection(fs, coleccionDir)), { ...datosDir, guardianId: acceso.guardianId, ...firmaNueva() });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      marcarAvisoVisto: async (id) => {
        if (!org) return;
        await updateDoc(doc(fs, `organizations/${org}/notifications/${id}`), { readAt: ahoraISO() }).catch(fallo);
      },
    };
  }, [functions, fs, org, uid, acceso, firmaNueva, fallo]);

  /** Archivos en Cloud Storage: se suben y se leen con la sesión del médico. Nunca hay enlaces públicos. */
  const archivos = useMemo<AppState['archivos']>(() => {
    const subir = async (ruta: string, archivo: { uri: string; mimeType: string }) => {
      const blob = await (await fetch(archivo.uri)).blob();
      await uploadBytes(refArchivo(storage, ruta), blob, { contentType: archivo.mimeType });
    };
    const abrir = async (ruta: string, nombre: string, mimeType?: string) => {
      const bytes = await getBytes(refArchivo(storage, ruta));
      await mostrarBytes(bytes, nombre, mimeType ?? tipoPorNombre(ruta));
    };
    return {
      subirDocumento: async (datos, archivo) => {
        if (!org) return 'No hay sesión.';
        const problema = problemaDelArchivo(archivo);
        if (problema) return problema;
        try {
          const ref = doc(collection(fs, `organizations/${org}/clinical/${datos.patientId}/documents`));
          const file = `orgs/${org}/patients/${datos.patientId}/documentos/${ref.id}-${nombreSeguro(archivo.name)}`;
          await subir(file, archivo);
          await setDoc(ref, { ...aFirestore('documents', { ...datos, file, mimeType: archivo.mimeType, origin: 'medico' }), ...firmaNueva() });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      abrirDocumento: async (d) => {
        if (!d.file) return 'Es un documento sin archivo cargado.';
        try { await abrir(d.file, `${nombreSeguro(d.title)}${d.file.match(/\.[a-z]+$/i)?.[0] ?? ''}`, d.mimeType); return null; } catch (e) { return mensajeDeError(e); }
      },
      guardarMaterial: async (datos, archivo) => {
        if (!org) return 'No hay sesión.';
        if (archivo) {
          const problema = problemaDelArchivo(archivo);
          if (problema) return problema;
        }
        try {
          const ref = doc(collection(fs, `organizations/${org}/educationalMaterials`));
          const file = archivo ? `orgs/${org}/materials/${ref.id}-${nombreSeguro(archivo.name)}` : undefined;
          if (archivo && file) await subir(file, archivo);
          await setDoc(ref, { ...aFirestore('educationalMaterials', { ...datos, file }), ...firmaNueva() });
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
      abrirMaterial: async (m) => {
        try {
          if (m.kind === 'enlace' && m.url) { await WebBrowser.openBrowserAsync(m.url); return null; }
          if (!m.file) return 'No encontramos el archivo de este material.';
          await abrir(m.file, nombreSeguro(m.title) + '.pdf', 'application/pdf');
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
    };
  }, [fs, org, storage, firmaNueva]);

  // La familia ve SOLO lo que armaron sus copias del portal.
  const vistaDeFamilia = useMemo(() => (sesion?.rol === 'familia'
    ? armarVistaFamilia({ copias, guardian: sesion.guardian, addresses: direcciones, doctor: VACIA.doctor, vacia: { ...VACIA, links: linksFamilia } })
    : null), [sesion, copias, direcciones, linksFamilia]);

  return useMemo<AppState>(() => ({
    fuente: 'firebase',
    listo,
    db: vistaDeFamilia ?? datos,
    sesion,
    usuarioId: uid,
    error,
    limpiarError: () => setError(null),
    ingresar: async (email, clave) => {
      try { await signInWithEmailAndPassword(auth, email.trim(), clave); setError(null); return null; } catch (e) {
        // Con segundo factor, la contraseña era correcta: falta el código de la app de autenticación.
        resolver.current = pideSegundoFactor(auth, e);
        if (resolver.current) { setSegundoFactorPendiente(true); return null; }
        return mensajeDeError(e);
      }
    },
    segundoFactorPendiente,
    confirmarSegundoFactor: async (codigo) => {
      if (!codigoValido(codigo)) return 'Escribí los 6 números que muestra la app de autenticación.';
      if (!resolver.current) return 'Volvé a escribir tu email y tu contraseña.';
      try {
        await ingresarConCodigo(resolver.current, codigo);
        resolver.current = null;
        setSegundoFactorPendiente(false);
        setError(null);
        return null;
      } catch (e) { return mensajeDeError(e); }
    },
    cancelarSegundoFactor: () => { resolver.current = null; setSegundoFactorPendiente(false); },
    seguridad: {
      noDisponible: EMULADORES ? 'Los emuladores de Firebase no permiten probar la app de autenticación: se activa en el proyecto real.' : null,
      factores,
      prepararAlta: async () => {
        if (!auth.currentUser) return { error: 'No hay sesión.' };
        try {
          const alta = await prepararAlta(auth.currentUser);
          secretoAlta.current = alta.secreto;
          return { clave: alta.clave, url: alta.url };
        } catch (e) { return { error: mensajeDeError(e) }; }
      },
      confirmarAlta: async (codigo) => {
        if (!codigoValido(codigo)) return 'Escribí los 6 números que muestra la app de autenticación.';
        if (!auth.currentUser || !secretoAlta.current) return 'Empezá de nuevo con "Activar".';
        try {
          await confirmarAlta(auth.currentUser, secretoAlta.current, codigo);
          secretoAlta.current = null;
          setFactores(factoresDe(auth.currentUser));
          return null;
        } catch (e) { return mensajeDeError(e); }
      },
    },
    entrarComoMedico: () => {},
    entrarComoAdulto: () => {},
    pedirEnlaceEmail: async (email) => {
      try {
        const r = await httpsCallable<unknown, { ok: boolean; enlaceDePrueba?: string }>(functions, 'pedirEnlace')({ email });
        return r.data.enlaceDePrueba ? { enlaceDePrueba: r.data.enlaceDePrueba } : {};
      } catch (e) { return { error: mensajeDeError(e) }; }
    },
    entrarConEnlace: async (token) => {
      try {
        const r = await httpsCallable<unknown, { token: string }>(functions, 'entrarConEnlace')({ token });
        await signInWithCustomToken(auth, r.data.token);
        setError(null);
        return null;
      } catch (e) { return mensajeDeError(e); }
    },
    salir: () => { signOut(auth).catch(fallo); },
    agregar,
    actualizar,
    enLote,
    operaciones,
    archivos,
  }), [archivos, listo, datos, vistaDeFamilia, sesion, uid, error, auth, functions, agregar, actualizar, enLote, operaciones, fallo, segundoFactorPendiente, factores]);
}
