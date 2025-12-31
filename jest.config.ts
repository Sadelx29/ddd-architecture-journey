module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Path mapping (igual que tsconfig)
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@payment/(.*)$': '<rootDir>/src/contexts/payment/$1',
    '^@billing/(.*)$': '<rootDir>/src/contexts/billing/$1',
    '^@inventory/(.*)$': '<rootDir>/src/contexts/inventory/$1',
    '^@orders/(.*)$': '<rootDir>/src/contexts/orders/$1',
  },
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*. d.ts',
    '!src/**/index.ts'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  verbose: true,
  testTimeout: 30000,
  
  // Ejecutar tests en serie (para TestContainers)
  maxWorkers: 1
};