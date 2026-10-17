/**
 * Tests de la lógica pura de las Cloud Functions (no necesitan emuladores): `npm run test:funciones`.
 */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  testMatch: ['<rootDir>/tests/funciones/**/*.test.ts'],
  // Las dependencias propias de las Functions (por ejemplo pdf-lib) están en functions/node_modules.
  moduleDirectories: ['node_modules', '<rootDir>/functions/node_modules'],
};
