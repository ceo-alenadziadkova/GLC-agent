import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// Resolve workspace packages from source here: Vitest/Vite pre-bundles this file via package "exports"
// which point at dist/ — absent in CI until those packages are built.
import { GLC_DEV_API_ORIGIN } from './packages/glc-dev-brand-defaults/src/index.ts'
import { API_HTTP_ROOT_PREFIX } from './packages/glc-api-paths/src/index.ts'

/** In CI, point the dev-server `/api` proxy at a real backend (e.g. staging) so Playwright can exercise orchestration E2E without a local `glc-audit-server`. */
function resolveApiProxyTarget(): string {
  const fromE2E = process.env.E2E_VITE_API_PROXY_TARGET?.trim()
  if (fromE2E) {
    return fromE2E.replace(/\/+$/, '')
  }
  return GLC_DEV_API_ORIGIN
}

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
      '@glc/snapshot-scan-coverage': path.resolve(
        __dirname,
        './packages/glc-snapshot-scan-coverage/src/index.ts',
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
      '@glc/intake-core/intake-case-patterns.v1.json': path.resolve(
        __dirname,
        './packages/intake-core/src/artifacts/intake-case-patterns.v1.json',
      ),
      '@glc/intake-core': path.resolve(__dirname, './packages/intake-core/src/index.ts'),
      '@glc/route-limits': path.resolve(__dirname, './packages/glc-route-limits/src/index.ts'),
      '@glc/api-paths': path.resolve(__dirname, './packages/glc-api-paths/src/index.ts'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    proxy: {
      [API_HTTP_ROOT_PREFIX]: {
        target: resolveApiProxyTarget(),
        changeOrigin: true,
      },
    },
  },
}))
