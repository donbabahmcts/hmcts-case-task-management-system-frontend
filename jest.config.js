module.exports = {
  roots: ['<rootDir>/src/test/unit', '<rootDir>/src/test/integration'],
  testRegex: '(/src/test/.*|\\.(test|spec))\\.(ts|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  modulePaths: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        types: ['jest', 'node'],
        skipLibCheck: true,
        isolatedModules: true,
      },
    }],
  },
};
