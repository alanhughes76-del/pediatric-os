/**
 * Tests de integración contra los emuladores (Auth, Firestore y Functions): `npm run test:integracion`.
 */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  testMatch: ['<rootDir>/tests/integracion/**/*.test.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
};
