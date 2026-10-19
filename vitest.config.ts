import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

const COVERAGE_THRESHOLD = 80

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            include: ['src/**/__tests__/**/*.spec.ts'],
            restoreMocks: true,
            coverage: {
                provider: 'v8',
                include: ['src/**/*.ts'],
                exclude: [
                    'src/**/__tests__/**',
                    'src/**/*.d.ts',
                    'src/index.ts',
                    'src/App.ts',
                    'src/modal/**',
                ],
                reporter: ['text', 'html', 'lcov'],
                thresholds: {
                    branches: COVERAGE_THRESHOLD,
                    functions: COVERAGE_THRESHOLD,
                    lines: COVERAGE_THRESHOLD,
                    statements: COVERAGE_THRESHOLD,
                },
            },
        },
    }),
)
