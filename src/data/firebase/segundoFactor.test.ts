/**
 * El emulador de Firebase no acepta TOTP, así que el recorrido se prueba con Firebase simulado:
 * qué se le pide al SDK y con qué datos.
 */
import { confirmarAlta, factoresDe, ingresarConCodigo, pideSegundoFactor, prepararAlta } from './segundoFactor';

const mockResolver = { hints: [{ factorId: 'totp', uid: 'f1' }], resolveSignIn: jest.fn() };
const mockEnroll = jest.fn();
const mockSecreto = { secretKey: 'JBSWY3DPEHPK3PXP', generateQrCodeUrl: jest.fn((cuenta: string, emisor: string) => `otpauth://totp/${emisor}:${cuenta}`) };

jest.mock('firebase/auth', () => ({
  getMultiFactorResolver: jest.fn(() => mockResolver),
  multiFactor: jest.fn(() => ({
    getSession: jest.fn(async () => 'sesion'),
    enroll: mockEnroll,
    enrolledFactors: [
      { factorId: 'totp', displayName: 'App de autenticación', enrollmentTime: 'Sun, 18 Oct 2026 10:00:00 GMT' },
      { factorId: 'phone', displayName: 'SMS', enrollmentTime: 'x' },
    ],
  })),
  TotpMultiFactorGenerator: {
    FACTOR_ID: 'totp',
    generateSecret: jest.fn(async () => mockSecreto),
    assertionForSignIn: jest.fn((uid: string, codigo: string) => ({ uid, codigo })),
    assertionForEnrollment: jest.fn((s: unknown, codigo: string) => ({ s, codigo })),
  },
}));

const auth = {} as never;
const usuario = { email: 'medico@ejemplo.com' } as never;

test('solo el error "falta el segundo factor" abre el pedido del código', () => {
  expect(pideSegundoFactor(auth, Object.assign(new Error('x'), { code: 'auth/multi-factor-auth-required' }))).toBe(mockResolver);
  expect(pideSegundoFactor(auth, Object.assign(new Error('x'), { code: 'auth/invalid-credential' }))).toBeNull();
  expect(pideSegundoFactor(auth, new Error('otra cosa'))).toBeNull();
});

test('ingresar: manda el código limpio con el factor TOTP de la cuenta', async () => {
  await ingresarConCodigo(mockResolver as never, '123 456');
  expect(mockResolver.resolveSignIn).toHaveBeenCalledWith({ uid: 'f1', codigo: '123456' });
});

test('una cuenta sin TOTP no intenta ingresar', async () => {
  await expect(ingresarConCodigo({ hints: [{ factorId: 'phone', uid: 'x' }], resolveSignIn: jest.fn() } as never, '123456'))
    .rejects.toMatchObject({ code: 'auth/missing-multi-factor-info' });
});

test('alta: clave y enlace con el email del médico y el nombre de la app; después se confirma con el código', async () => {
  const alta = await prepararAlta(usuario);
  expect(alta.clave).toBe('JBSWY3DPEHPK3PXP');
  expect(mockSecreto.generateQrCodeUrl).toHaveBeenCalledWith('medico@ejemplo.com', 'Pediatría Integral');
  await confirmarAlta(usuario, alta.secreto, '654-321');
  expect(mockEnroll).toHaveBeenCalledWith({ s: mockSecreto, codigo: '654321' }, 'App de autenticación');
});

test('lista solo los factores TOTP', () => {
  expect(factoresDe(usuario)).toEqual([{ nombre: 'App de autenticación', desde: 'Sun, 18 Oct 2026 10:00:00 GMT' }]);
  expect(factoresDe(null)).toEqual([]);
});
