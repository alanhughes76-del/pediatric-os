/**
 * Endpoint único para lo que entra desde Make (prompt maestro 8.1): `POST /entradaMake`.
 * Cuerpo: { "tipo": "plaud.transcripcion", "id": "<id único del envío>", "datos": { … } }.
 * - Firma: encabezado `X-PediatricOS-Signature` = "sha256=" + HMAC-SHA256 del cuerpo con el mismo
 *   secreto compartido de los eventos (MAKE_WEBHOOK_SECRET). Sin secreto configurado, no acepta nada.
 * - Idempotente: el mismo `tipo` + `id` se procesa una sola vez (queda en `inbound`).
 * - No registra datos personales en los logs. Cal.com tiene su propio endpoint (reservaCalcom).
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { db } from '../config';
import { ORGANIZACION_ID } from '../params';
import { isoArgentina } from '../../../shared/fechaHora';
import { ENCABEZADO_FIRMA, firmaValida } from '../outbox/envio';
import { esTipoEntrada, obj, texto } from './leer';
import { procesarEntrada } from './acciones';

const MAKE_WEBHOOK_SECRET = defineSecret('MAKE_WEBHOOK_SECRET');

export const entradaMake = onRequest({ secrets: [MAKE_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Solo POST'); return; }
  const org = ORGANIZACION_ID.value();
  const secreto = MAKE_WEBHOOK_SECRET.value();
  if (!org || !secreto) { res.status(503).json({ ok: false, error: 'Falta configurar el endpoint' }); return; }
  if (!firmaValida(req.rawBody.toString('utf8'), secreto, req.get(ENCABEZADO_FIRMA))) { res.status(401).json({ ok: false, error: 'Firma inválida' }); return; }

  const cuerpo = obj(req.body);
  const tipo = cuerpo.tipo;
  const id = texto(cuerpo.id, 200);
  if (!esTipoEntrada(tipo)) { res.status(400).json({ ok: false, error: 'Tipo desconocido' }); return; }
  if (!id) { res.status(400).json({ ok: false, error: 'Falta el id del envío' }); return; }

  const registro = db().doc(`organizations/${org}/inbound/${`${tipo}__${id}`.replace(/[^\w.-]+/g, '_').slice(0, 300)}`);
  const previo = (await registro.get()).data();
  if (previo) { res.status(200).json({ ok: true, repetido: true, resultado: previo.result }); return; }

  try {
    const r = await procesarEntrada(org, tipo, obj(cuerpo.datos));
    await registro.set({ organizationId: org, source: 'make', type: tipo, result: r.resultado, status: r.estado, receivedAt: isoArgentina() });
    logger.info('Entrada de Make', { tipo, resultado: r.resultado });
    res.status(r.estado).json(r.cuerpo);
  } catch (e) {
    logger.error('No se pudo procesar una entrada de Make', { tipo, error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ ok: false, error: 'Error' });
  }
});
