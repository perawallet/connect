import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

// Ratchet: raise these as coverage grows, never lower them to land a change.
const COVERAGE_THRESHOLDS = {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95,
}

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            restoreMocks: true,
            projects: [
                {
                    extends: true,
                    test: {
                        name: 'unit',
                        include: ['src/**/__tests__/**/*.spec.ts'],
                    },
                },
                {
                    // Public-API flows against the real modal elements, with
                    // only the wallets faked (see src/__integration__/README).
                    extends: true,
                    test: {
                        name: 'integration',
                        include: ['src/__integration__/**/*.spec.ts'],
                    },
                },
            ],
            coverage: {
                provider: 'v8',
                include: ['src/**/*.ts'],
                exclude: [
                    'src/**/__tests__/**',
                    'src/__integration__/**',
                    'src/**/*.d.ts',
                ],
                reporter: ['text', 'html', 'lcov'],
                thresholds: COVERAGE_THRESHOLDS,
            },
        },
    }),
)
