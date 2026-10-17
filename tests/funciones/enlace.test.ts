import { codigoConFormaValida, emailValido, enlaceDeIngreso, estadoDelEnlace, huella, mailDelEnlace, normalizarEmail, nuevoCodigo, VALIDEZ_MS } from '../../functions/src/portal/enlaceLogica';

describe('enlace mágico', () => {
  test('código aleatorio; la base guarda solo la huella', () => {
    const a = nuevoCodigo();
    const b = nuevoCodigo();
    expect(a).not.toBe(b);
    expect(codigoConFormaValida(a)).toBe(true);
    expect(huella(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(huella(a)).not.toContain(a);
    expect(codigoConFormaValida('../../x')).toBe(false);
  });

  test('15 minutos y un solo uso', () => {
    const t0 = 1_000_000;
    const e = { expiresAtMs: t0 + VALIDEZ_MS };
    expect(estadoDelEnlace(e, t0)).toBe('valido');
    expect(estadoDelEnlace(e, t0 + VALIDEZ_MS + 1)).toBe('vencido');
    expect(estadoDelEnlace({ ...e, usedAt: 'x' }, t0)).toBe('usado');
    expect(estadoDelEnlace(undefined, t0)).toBe('invalido');
  });

  test('emails y enlace', () => {
    expect(normalizarEmail('  Lucia@Ejemplo.com ')).toBe('lucia@ejemplo.com');
    expect(emailValido('lucia@ejemplo.com')).toBe(true);
    expect(emailValido('lucia')).toBe(false);
    expect(enlaceDeIngreso('https://app.ejemplo.com/', 'abc')).toBe('https://app.ejemplo.com/ingresar?token=abc');
  });

  test('el mail no lleva información clínica, solo el enlace', () => {
    const m = mailDelEnlace('Lucía', 'https://app/ingresar?token=x');
    expect(m.texto).toContain('Hola, Lucía.');
    expect(m.texto).toContain('https://app/ingresar?token=x');
    expect(m.texto).toContain('Vale 15 minutos');
  });
});
