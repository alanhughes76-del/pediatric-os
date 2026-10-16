import type { Guardian } from '@/data/types';
import { pedirEnlace, usarEnlace } from './enlaceMagico';

const adulto = (id: string, email: string, accessEnabled: boolean): Guardian => ({ id, email, accessEnabled, firstName: id, lastName: 'X', createdAt: '', createdBy: '' });
const adultos = [adulto('lucia', 'lucia@ejemplo.com', true), adulto('diego', 'diego@ejemplo.com', false), adulto('sin', '', true)];
const T0 = 1_000_000;

test('solo los adultos habilitados con ese email reciben enlace (sin distinguir mayúsculas)', () => {
  expect(pedirEnlace(adultos, 'LUCIA@ejemplo.com', T0, 'a')?.guardianId).toBe('lucia');
  expect(pedirEnlace(adultos, 'diego@ejemplo.com', T0, 'b')).toBeNull();
  expect(pedirEnlace(adultos, 'nadie@ejemplo.com', T0, 'c')).toBeNull();
  expect(pedirEnlace(adultos, '', T0, 'd')).toBeNull();
});

test('vale 15 minutos', () => {
  const e = pedirEnlace(adultos, 'lucia@ejemplo.com', T0, 'a')!;
  expect(usarEnlace([e], 'a', T0 + 15 * 60000, adultos).resultado.ok).toBe(true);
  expect(usarEnlace([e], 'a', T0 + 15 * 60000 + 1, adultos).resultado).toEqual({ ok: false, motivo: 'vencido' });
});

test('se usa una sola vez', () => {
  const e = pedirEnlace(adultos, 'lucia@ejemplo.com', T0, 'a')!;
  const primera = usarEnlace([e], 'a', T0 + 1000, adultos);
  expect(primera.resultado.ok).toBe(true);
  expect(usarEnlace(primera.enlaces, 'a', T0 + 2000, adultos).resultado).toEqual({ ok: false, motivo: 'usado' });
});

test('un enlace desconocido o de un adulto deshabilitado después no sirve', () => {
  expect(usarEnlace([], 'x', T0, adultos).resultado).toEqual({ ok: false, motivo: 'invalido' });
  const e = pedirEnlace(adultos, 'lucia@ejemplo.com', T0, 'a')!;
  const deshabilitada = adultos.map((g) => (g.id === 'lucia' ? { ...g, accessEnabled: false } : g));
  expect(usarEnlace([e], 'a', T0 + 1000, deshabilitada).resultado).toEqual({ ok: false, motivo: 'invalido' });
});
