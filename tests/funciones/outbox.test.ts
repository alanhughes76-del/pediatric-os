/**
 * Envío de eventos a Make: firma HMAC y reintentos. Se prueba contra un servidor HTTP local
 * que hace de webhook de prueba (prueba 16 del prompt maestro, del lado del envío).
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { MAX_INTENTOS, cuerpoDe, despuesDelIntento, enviarEvento, esperaMs, firmaValida, firmar, type EventoSaliente } from '../../functions/src/outbox/envio';
import { TIPOS_EVENTO, esTipoEvento } from '../../functions/src/outbox/eventos';

const SECRETO = 'secreto-de-prueba';
const evento: EventoSaliente = { id: 'ev1', type: 'turno.confirmado', occurredAt: '2026-10-17T13:00:00.000Z', organizationId: 'org-demo', data: { appointmentId: 't1' } };

let servidor: Server;
let url: string;
let respuestas: number[] = [];
const recibidos: { cuerpo: string; firma?: string; tipo?: string }[] = [];

beforeAll(async () => {
  servidor = createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      recibidos.push({ cuerpo, firma: req.headers['x-pediatricos-signature'] as string, tipo: req.headers['x-pediatricos-event'] as string });
      res.statusCode = respuestas.shift() ?? 200;
      res.end();
    });
  });
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/make`;
});
afterAll(() => new Promise<void>((ok) => servidor.close(() => ok())));
beforeEach(() => { recibidos.length = 0; respuestas = []; });

test('el evento sale con la firma correcta, verificable con el mismo secreto', async () => {
  const r = await enviarEvento(evento, { url, secreto: SECRETO });
  expect(r).toEqual({ ok: true, status: 200 });
  const [rec] = recibidos;
  expect(rec.tipo).toBe('turno.confirmado');
  expect(rec.cuerpo).toBe(cuerpoDe(evento));
  expect(firmaValida(rec.cuerpo, SECRETO, rec.firma)).toBe(true);
  expect(firmaValida(rec.cuerpo, 'otro-secreto', rec.firma)).toBe(false);
});

test('ante un error del webhook queda para reintentar, y después se envía', async () => {
  respuestas = [500];
  const ahora = new Date('2026-10-17T13:00:00.000Z');
  const primero = despuesDelIntento(await enviarEvento(evento, { url, secreto: SECRETO }), 0, ahora);
  expect(primero).toMatchObject({ status: 'reintentar', attempts: 1, lastStatus: 500, nextAttemptAt: '2026-10-17T13:01:00.000Z' });
  const segundo = despuesDelIntento(await enviarEvento(evento, { url, secreto: SECRETO }), primero.attempts, ahora);
  expect(segundo).toMatchObject({ status: 'enviado', attempts: 2, nextAttemptAt: null });
  expect(recibidos).toHaveLength(2);
});

test('si el webhook no responde, también se reintenta', async () => {
  const r = await enviarEvento(evento, { url: 'http://127.0.0.1:1/cerrado', secreto: SECRETO, timeoutMs: 2000 });
  expect(r.ok).toBe(false);
  expect(despuesDelIntento(r, 0, new Date()).status).toBe('reintentar');
});

test('la espera crece y tiene tope; después de varios intentos queda fallido', () => {
  expect([1, 2, 3, 4].map(esperaMs)).toEqual([60_000, 120_000, 240_000, 480_000]);
  expect(esperaMs(30)).toBe(6 * 3_600_000);
  expect(despuesDelIntento({ ok: false, error: 'x' }, MAX_INTENTOS - 1, new Date()).status).toBe('fallido');
});

test('la firma tiene el formato sha256=<hex>', () => {
  expect(firmar('{}', SECRETO)).toMatch(/^sha256=[0-9a-f]{64}$/);
});

test('están todos los eventos de la sección 8.1', () => {
  expect(TIPOS_EVENTO).toHaveLength(23);
  expect(esTipoEvento('resumen.envio_aprobado')).toBe(true);
  expect(esTipoEvento('inventado')).toBe(false);
});
