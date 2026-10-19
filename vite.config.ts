import { defineConfig } from 'vite'

import pkg from './package.json' with { type: 'json' }

const externalPackages = [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies),
]

export default defineConfig({
    define: {
        PERA_CONNECT_VERSION: JSON.stringify(`v${pkg.version}`),
    },
    build: {
        target: 'es2020',
        sourcemap: true,
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
            fileName: 'index',
        },
        rolldownOptions: {
            external: id =>
                externalPackages.some(
                    name => id === name || id.startsWith(`${name}/`),
                ),
        },
    },
})
