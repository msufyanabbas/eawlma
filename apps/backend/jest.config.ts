import type { Config } from 'jest';

/**
 * Standalone Jest config so the previously-inline config in package.json
 * doesn't fork against this file. `jest-extended/all` brings in the toBeArray,
 * toIncludeAllMembers, toBeOneOf, etc. matchers used by the spec suite.
 */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // `setupFiles` runs BEFORE the test framework loads — used here to set
  // NODE_ENV=test so Kafka producers/consumers short-circuit on import.
  setupFiles: ['<rootDir>/../jest.env.ts'],
  // `setupFilesAfterEnv` runs after framework but before tests; jest-extended
  // belongs here so its matchers attach to the live `expect`.
  setupFilesAfterEnv: ['jest-extended/all'],
  // Long-running integration tests against a live database — bump the
  // default 5s timeout so HTTP round-trips and bcrypt hashing don't trip
  // the assertion timer.
  testTimeout: 30_000,
  // Some Nest modules (bullmq, ws, schedule) hold timers / sockets open even
  // after AppModule.close(); force the worker to exit so jest doesn't hang.
  forceExit: true,
  detectOpenHandles: false,
};

export default config;
