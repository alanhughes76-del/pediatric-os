import { claveEnGrupos, codigoValido, limpiarCodigo, mensajeSegundoFactor, modulosQR } from './segundoFactor';

describe('segundo factor', () => {
  test('el código: seis números, con espacios o guiones', () => {
    expect(limpiarCodigo('123 456')).toBe('123456');
    expect(codigoValido('123-456')).toBe(true);
    expect(codigoValido('12345')).toBe(false);
    expect(codigoValido('12345a')).toBe(false);
    expect(codigoValido('')).toBe(false);
  });

  test('la clave se muestra en grupos de cuatro', () => {
    expect(claveEnGrupos('ABCDEFGHIJ')).toBe('ABCD EFGH IJ');
    expect(claveEnGrupos('ABCD')).toBe('ABCD');
  });

  test('el QR es cuadrado y tiene los tres cuadros de posición', () => {
    const m = modulosQR('otpauth://totp/Pediatric%20OS:medico%40ejemplo.com?secret=JBSWY3DPEHPK3PXP&issuer=Pediatric%20OS');
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((fila) => fila.length === m.length)).toBe(true);
    const n = m.length;
    // Esquinas superior izquierda, superior derecha e inferior izquierda: cuadro oscuro de 7.
    for (const [f, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      expect(m[f][c] && m[f][c + 6] && m[f + 6][c] && m[f + 6][c + 6]).toBe(true);
    }
  });

  test('errores en palabras; lo desconocido queda para el mensaje general', () => {
    expect(mensajeSegundoFactor('auth/invalid-verification-code')).toMatch(/código no es correcto/);
    expect(mensajeSegundoFactor('auth/requires-recent-login')).toMatch(/volvé a entrar/);
    expect(mensajeSegundoFactor('auth/operation-not-allowed')).toMatch(/no está activado/);
    expect(mensajeSegundoFactor('auth/otra-cosa')).toBeNull();
  });
});
