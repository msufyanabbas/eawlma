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
  // `setupFilesAfterEnv` runs each module after the test framework is set up
  // but before tests execute — the canonical place to register custom
  // matchers like jest-extended.
  setupFilesAfterEnv: ['jest-extended/all'],
  // Long-running integration tests against a live database — bump the
  // default 5s timeout so HTTP round-trips and bcrypt hashing don't trip
  // the assertion timer.
  testTimeout: 30_000,
};

export default config;
