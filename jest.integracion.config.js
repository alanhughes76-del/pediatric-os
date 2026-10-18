/**
 * Tests de integración contra los emuladores (Auth, Firestore y Functions): `npm run test:integracion`.
 */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  testMatch: ['<rootDir>/tests/integracion/**/*.test.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  // Algunas pruebas llaman directo a funciones del servidor (por ejemplo, los avisos programados).
  moduleDirectories: ['node_modules', '<rootDir>/functions/node_modules'],
};
