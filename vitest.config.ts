import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['api/**/*.test.ts', 'src/**/*.test.ts'],
          exclude: ['**/*.e2e.test.ts', 'node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['**/*.e2e.test.ts'],
          exclude: ['node_modules/**'],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
