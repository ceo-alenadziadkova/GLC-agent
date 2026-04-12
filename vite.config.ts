import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// Bare @glc/dev-brand-defaults resolves to dist/ during config preload; use source so CI need not prebuild.
import { GLC_DEV_API_ORIGIN } from './packages/glc-dev-brand-defaults/src/index.ts'

export default defineConfig(({ mode }) => ({
  esbuild: {
    drop: mode === 'production' ? (['console', 'debugger'] as const) : [],
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Shared snapshot helpers consumed by the SPA (must stay free of Node-only imports)
      '@shared/snapshot-scan-coverage': path.resolve(
        __dirname,
        './server/src/snapshot/scan-coverage-from-stored-json.ts',
      ),
      '@glc/intake-core/question-bank.v1.json': path.resolve(
        __dirname,
        './packages/intake-core/src/question-bank.v1.json',
      ),
      '@glc/intake-core/intake-policy.v1.json': path.resolve(
        __dirname,
        './packages/intake-core/src/intake-policy.v1.json',
      ),
      '@glc/intake-core/artifacts/layout-rules-1.1.0.json': path.resolve(
        __dirname,
        './packages/intake-core/src/artifacts/layout-rules-1.1.0.json',
      ),
      '@glc/dev-brand-defaults/public-brand-defaults.v1.json': path.resolve(
        __dirname,
        './packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json',
      ),
      '@glc/dev-brand-defaults': path.resolve(__dirname, './packages/glc-dev-brand-defaults/src/index.ts'),
      '@glc/intake-core': path.resolve(__dirname, './packages/intake-core/src/index.ts'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    proxy: {
      '/api': {
        target: GLC_DEV_API_ORIGIN,
        changeOrigin: true,
      },
    },
  },
}))
