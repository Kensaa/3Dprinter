import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), wasm()],
    resolve: {
        alias: {
            '~bootstrap': resolve(
                __dirname,
                '..',
                '..',
                'node_modules/bootstrap'
            ),
            '~normalize.css': resolve(
                __dirname,
                '..',
                '..',
                'node_modules/normalize.css'
            )
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: [
                    'mixed-decls',
                    'color-functions',
                    'legacy-js-api',
                    'global-builtin',
                    'if-function',
                    'import'
                ]
            }
        }
    },
    optimizeDeps: { include: ['utils'] }
})
