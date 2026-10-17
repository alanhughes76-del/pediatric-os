/**
 * Tests de las Security Rules (Firestore y Storage) contra los emuladores.
 * Se corren con `npm run test:reglas`, que levanta los emuladores, corre los tests y los apaga.
 */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  testMatch: ['<rootDir>/tests/reglas/**/*.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
};
