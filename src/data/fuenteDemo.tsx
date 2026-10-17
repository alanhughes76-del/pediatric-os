/**
 * Fuente de datos de demostración: datos ficticios en memoria y sesión simulada.
 * Se reinician al recargar la app. Todas las escrituras suman una fila al AuditLog
 * (solo se agregan filas; nunca se editan ni se borran).
 */
import { useCallback, useMemo, useState } from 'react';
import { datosDeEjemplo, DOCTOR_ID } from './mock';
import type { AuditLog, Certificate, ClinicalNote, Database, Document, FollowUp } from './types';
import type { AppState, Sesion } from './contrato';
import { vistaFamilia } from './vistaFamilia';
import { buscarDuplicados } from '@shared/duplicados';
import { horasDeSeguimiento, mensajeDeSeguimiento } from './selectores';
import { pedirEnlace, usarEnlace, type Enlace } from '@/lib/enlaceMagico';
import { FIRMA } from '@/lib/certificados';
import { ahoraISO, sumarHoras } from '@/lib/fechas';
import { accionTurnoDemo, crearTurnoDemo, type Contexto } from './turnosDemo';

let contador = 0;
export const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

export function useFuenteDemo(): AppState {
  const [db, setDb] = useState<Database>(datosDeEjemplo);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const usuarioId = sesion?.usuarioId ?? DOCTOR_ID;

  const filaLog = useCallback(
    (a: Omit<AuditLog, 'id' | 'at' | 'actorId'>, actorId = usuarioId): AuditLog => ({ id: nuevoId('au'), at: ahoraISO(), actorId, ...a }),
    [usuarioId],
  );

  const agregar = useCallback<AppState['agregar']>((tabla, fila, accion) => {
    const id = fila.id ?? nuevoId(tabla.slice(0, 3));
    const completa = { ...fila, id, createdAt: ahoraISO(), createdBy: usuarioId };
    setDb((d) => ({
      ...d,
      [tabla]: [...(d[tabla] as unknown[]), completa],
      auditLog: [...d.auditLog, filaLog({ action: accion ?? `${tabla}.agregar`, entity: tabla, entityId: id })],
    }));
    return id;
  }, [usuarioId, filaLog]);

  const actualizar = useCallback<AppState['actualizar']>((tabla, id, cambios, accion) => {
    setDb((d) => ({
      ...d,
      [tabla]: (d[tabla] as { id: string }[]).map((f) => (f.id === id ? { ...f, ...cambios } : f)),
      auditLog: [...d.auditLog, filaLog({ action: accion ?? `${tabla}.editar`, entity: tabla, entityId: id, detail: Object.keys(cambios).join(', ') })],
    }));
  }, [filaLog]);

  const enLote = useCallback<AppState['enLote']>((fn) => {
    setDb((d) => {
      const nuevos: AuditLog[] = [];
      const res = fn(d, { ahora: ahoraISO(), usuarioId, log: (a) => nuevos.push(filaLog(a)) });
      return { ...res, auditLog: [...res.auditLog, ...nuevos] };
    });
  }, [usuarioId, filaLog]);

  const operaciones = useMemo<AppState['operaciones']>(() => {
    const contexto = (): Contexto => ({ ahora: ahoraISO(), ahoraMs: Date.now(), usuarioId, nuevoId });
    return {
    crearPaciente: async (datos, confirmar) => {
      const { mismoDni, posibles } = buscarDuplicados(db.patients, datos);
      if (mismoDni.length > 0) return { estado: 'error', mensaje: 'Ya hay un paciente con ese DNI.' };
      if (posibles.length > 0 && !confirmar) return { estado: 'posible-duplicado' };
      return { estado: 'creado', id: agregar('patients', datos, 'paciente.crear') };
    },

    aprobarNota: async ({ nota, consulta, campos, origen }) => {
      enLote((d, { ahora, usuarioId: uid, log }) => {
        const aprobada: ClinicalNote = { ...nota, ...campos, origin: origen, status: 'aprobada', updatedAt: ahora, approvedAt: ahora, approvedBy: uid };
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
            const nuevo: FollowUp = { id: nuevoId('fu'), createdAt: ahora, createdBy: uid, consultationId: consulta.id, patientId: nota.patientId, status: 'pendiente', ...datos };
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
      return null;
    },

    corregirNota: async (nota) => {
      enLote((d, { ahora, usuarioId: uid, log }) => {
        const nueva: ClinicalNote = {
          ...nota, id: nuevoId('n'), version: nota.version + 1, previousVersionId: nota.id, status: 'borrador', origin: 'humano',
          createdAt: ahora, createdBy: uid, updatedAt: ahora, approvedAt: undefined, approvedBy: undefined,
        };
        log({ action: 'nota.corregir', entity: 'notes', entityId: nota.id, detail: `v${nota.version} → v${nueva.version}` });
        return { ...d, notes: [...d.notes.map((n) => (n.id === nota.id ? { ...n, status: 'reemplazada' as const } : n)), nueva] };
      });
      return null;
    },

    emitirCertificado: async ({ titulo, ...datos }) => {
      enLote((d, { ahora, usuarioId: uid, log }) => {
        const base = { createdAt: ahora, createdBy: uid };
        const certId = nuevoId('cert');
        const docId = nuevoId('doc');
        const certificado: Certificate = { ...base, ...datos, id: certId, signature: FIRMA, status: 'emitido', documentId: docId };
        const documento: Document = {
          ...base, id: docId, patientId: datos.patientId, title: titulo, date: datos.date,
          file: `certificados/${datos.patientId}/${certId}.pdf`, certificateId: certId,
        };
        log({ action: 'certificado.emitir', entity: 'certificates', entityId: certId, detail: datos.type });
        return { ...d, certificates: [...d.certificates, certificado], documents: [...d.documents, documento] };
      });
      return null;
    },

    anularCertificado: async (c, motivo) => {
      actualizar('certificates', c.id, { status: 'anulado', voidReason: motivo, voidedAt: ahoraISO() }, 'certificado.anular');
      return null;
    },

    crearTurno: async (datos) => {
      const salida = crearTurnoDemo(db, contexto(), datos);
      if (salida.db !== db) setDb(salida.db);
      return salida.resultado;
    },

    accionTurno: async (pedido) => {
      const salida = accionTurnoDemo(db, contexto(), pedido);
      if (salida.db !== db) setDb(salida.db);
      return salida.resultado;
    },
  };
  }, [db, agregar, actualizar, enLote, usuarioId]);

  // Con sesión de familia, las pantallas solo reciben la vista filtrada.
  const guardianId = sesion?.rol === 'familia' ? sesion.guardian.id : null;
  const dbVisible = useMemo(() => (guardianId ? vistaFamilia(db, guardianId) : db), [db, guardianId]);

  return useMemo<AppState>(() => ({
    fuente: 'demo',
    listo: true,
    db: dbVisible,
    sesion,
    usuarioId,
    error: null,
    limpiarError: () => {},
    ingresar: async () => 'En el modo demostración se entra con el selector de rol.',
    entrarComoMedico: () => setSesion({ rol: 'medico', usuarioId: DOCTOR_ID }),
    entrarComoAdulto: (id) => {
      const guardian = db.guardians.find((g) => g.id === id);
      if (!guardian?.accessEnabled) return;
      setSesion({ rol: 'familia', usuarioId: guardian.id, guardian });
      // Registro de accesos
      setDb((d) => ({ ...d, auditLog: [...d.auditLog, filaLog({ action: 'login', detail: 'modo prueba' }, guardian.id)] }));
    },
    pedirEnlaceEmail: (email) => {
      const enlace = pedirEnlace(db.guardians, email, Date.now(), nuevoId('enlace'));
      if (enlace) setEnlaces((xs) => [...xs, enlace]);
      return enlace?.token ?? null;
    },
    entrarConEnlace: (token) => {
      const { resultado, enlaces: nuevos } = usarEnlace(enlaces, token, Date.now(), db.guardians);
      setEnlaces(nuevos);
      if (resultado.ok) {
        const guardian = db.guardians.find((g) => g.id === resultado.guardianId)!;
        setSesion({ rol: 'familia', usuarioId: guardian.id, guardian });
        setDb((d) => ({ ...d, auditLog: [...d.auditLog, filaLog({ action: 'login', detail: 'enlace por email' }, guardian.id)] }));
      }
      return resultado;
    },
    salir: () => setSesion(null),
    agregar,
    actualizar,
    enLote,
    operaciones,
  }), [db, dbVisible, sesion, enlaces, usuarioId, agregar, actualizar, enLote, filaLog, operaciones]);
}
