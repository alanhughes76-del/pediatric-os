/**
 * Turnos (prompt maestro 7.2): crear y cada acción pasan por el servidor. Las reglas no dejan
 * escribir `appointments` desde la app. Pueden usarlas el médico y el asistente.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config';
import { exigirRol, id } from '../permisos';
import { isoArgentina } from '../../../shared/fechaHora';
import { accionPermitida, estadoDespues, TEXTO_ESTADO_TURNO, type AccionTurno } from '../../../shared/agenda';
import { completar, turnoNuevo, validarCampos, validarDuracion, validarInicio, type Turno } from './datos';
import { guardarTurno } from './operacion';

const ACCIONES: AccionTurno[] = ['pendiente', 'confirmar', 'reprogramar', 'editar', 'cancelar', 'realizado', 'ausente', 'en_camino'];

/** Los pacientes existen y, si hay familia, son de esa familia. Devuelve la familia que corresponde. */
async function revisarPacientes(org: string, patientIds: string[], familyId: string | null): Promise<string | null> {
  if (patientIds.length === 0) return familyId;
  const docs = await Promise.all(patientIds.map((p) => db().doc(`organizations/${org}/patients/${p}`).get()));
  if (docs.some((d) => !d.exists)) throw new HttpsError('not-found', 'No encontramos a uno de los pacientes.');
  const familias = new Set(docs.map((d) => d.data()?.familyId ?? null));
  const familia = familyId ?? [...familias][0] ?? null;
  if (familyId && docs.some((d) => (d.data()?.familyId ?? null) !== familyId)) {
    throw new HttpsError('invalid-argument', 'Los pacientes tienen que ser de la familia del turno.');
  }
  return familia;
}

export const crearTurno = onCall<Record<string, unknown>>(async (req) => {
  const { uid, org } = exigirRol(req, ['medico', 'asistente']);
  const datos = req.data ?? {};
  const ref = db().collection(`organizations/${org}/appointments`).doc();
  // Validar antes de la transacción, para que un error de datos no la abra.
  const campos = validarCampos(datos);
  const familyId = await revisarPacientes(org, campos.patientIds ?? [], campos.familyId ?? null);
  return guardarTurno({
    org, uid, ref, accion: 'crear', aceptarAvisos: datos.aceptarAvisos === true,
    armar: (actual, config) => {
      if (actual) throw new HttpsError('already-exists', 'Ese turno ya existe.');
      return turnoNuevo({ org, uid, ahora: isoArgentina(), datos: { ...datos, familyId }, config });
    },
  });
});

export const accionTurno = onCall<Record<string, unknown>>(async (req) => {
  const { uid, org } = exigirRol(req, ['medico', 'asistente']);
  const d = req.data ?? {};
  const turnoId = id(d.id, 'El turno');
  const accion = d.accion as AccionTurno;
  if (!ACCIONES.includes(accion)) throw new HttpsError('invalid-argument', 'La acción no es válida.');

  const motivo = typeof d.motivo === 'string' ? d.motivo.trim().slice(0, 500) : '';
  if (accion === 'cancelar' && !motivo) throw new HttpsError('invalid-argument', 'Para cancelar, escribí el motivo.');
  const start = accion === 'reprogramar' ? validarInicio(d.start) : null;
  const durationMin = accion === 'reprogramar' && d.durationMin !== undefined ? validarDuracion(d.durationMin) : null;
  const campos = accion === 'editar' ? validarCampos((d.cambios ?? {}) as Record<string, unknown>) : {};
  if (accion === 'editar' && campos.patientIds) {
    campos.familyId = await revisarPacientes(org, campos.patientIds, campos.familyId ?? null);
  }

  const ref = db().doc(`organizations/${org}/appointments/${turnoId}`);
  return guardarTurno({
    org, uid, ref, accion, motivo: motivo || undefined, aceptarAvisos: d.aceptarAvisos === true,
    armar: (actual, config) => {
      if (!actual) throw new HttpsError('not-found', 'No encontramos ese turno.');
      if (!accionPermitida(actual.status, accion)) {
        throw new HttpsError('failed-precondition', `No se puede hacer eso con un turno ${TEXTO_ESTADO_TURNO[actual.status].toLowerCase()}.`);
      }
      const ahora = isoArgentina();
      const nuevo: Turno = { ...actual, ...campos, status: estadoDespues(actual.status, accion), updatedBy: uid, updatedAt: ahora };
      if (start) nuevo.start = start;
      if (durationMin) nuevo.durationMin = durationMin;
      if (accion === 'cancelar') nuevo.cancelReason = motivo;
      if (accion === 'en_camino') nuevo.onTheWayAt = ahora;
      // Al identificar la familia, el contacto provisorio deja de hacer falta.
      if (campos.familyId && nuevo.porIdentificar) delete nuevo.porIdentificar;
      if (nuevo.type !== 'prenatal' && nuevo.patientIds.length === 0 && !nuevo.porIdentificar) {
        throw new HttpsError('invalid-argument', 'Elegí al menos un paciente.');
      }
      return completar(nuevo, config);
    },
  });
});
