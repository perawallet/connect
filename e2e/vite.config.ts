import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

// A stand-in dApp that consumes the built package the way an integrator's
// bundler does: through dist/, with the dependencies resolved from
// node_modules rather than from our sources.
export default defineConfig({
    root: fileURLToPath(new URL('./app', import.meta.url)),
    resolve: {
        alias: {
            '@perawallet/connect': fileURLToPath(
                new URL('../dist/index.js', import.meta.url),
            ),
        },
    },
    build: {
        outDir: fileURLToPath(new URL('./.output', import.meta.url)),
        emptyOutDir: true,
        // algosdk alone outweighs the default limit; size is not under test here.
        chunkSizeWarningLimit: 2048,
    },
    preview: { port: 4173, strictPort: true },
})
