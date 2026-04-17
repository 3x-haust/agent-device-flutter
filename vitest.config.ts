import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/e2e/**'],
    testTimeout: 10_000,
    environment: 'node',
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'test-results/vitest-junit.xml' },
  },
});
