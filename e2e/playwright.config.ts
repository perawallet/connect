import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './specs',
    outputDir: './test-results',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['list']] : 'list',
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Lets machines with a preinstalled Chromium skip the download.
                launchOptions: {
                    executablePath:
                        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
                },
            },
        },
    ],
    webServer: {
        command:
            'vite build -c e2e/vite.config.ts && vite preview -c e2e/vite.config.ts',
        cwd: '..',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
    },
})
