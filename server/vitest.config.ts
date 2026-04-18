import path from 'node:path';
import { defineConfig } from 'vitest/config';

const root = path.resolve(import.meta.dirname, '..');

export default defineConfig({
  resolve: {
    alias: {
      '@glc/intake-core/question-bank.v1.json': path.join(
        root,
        'packages/intake-core/src/question-bank.v1.json',
      ),
      '@glc/intake-core/intake-policy.v1.json': path.join(
        root,
        'packages/intake-core/src/intake-policy.v1.json',
      ),
      '@glc/intake-core/artifacts/layout-rules-1.1.0.json': path.join(
        root,
        'packages/intake-core/src/artifacts/layout-rules-1.1.0.json',
      ),
      '@glc/intake-core/discovery-brief-fallbacks.v1.json': path.join(
        root,
        'packages/intake-core/src/discovery-brief-fallbacks.v1.json',
      ),
      '@glc/intake-core/lint-node': path.join(root, 'packages/intake-core/src/lint-node.ts'),
      /** Must be before `@glc/intake-core` — otherwise Vite treats the package alias as a file and appends `/config/...`. */
      '@glc/intake-core/config/intake-flags.js': path.join(
        root,
        'packages/intake-core/src/config/intake-flags.ts',
      ),
      '@glc/intake-core': path.join(root, 'packages/intake-core/src/index.ts'),
      '@glc/snapshot-scan-coverage': path.join(root, 'packages/glc-snapshot-scan-coverage/src/index.ts'),
      /** Before `@glc/dev-brand-defaults` — otherwise the package alias is treated as a directory. */
      '@glc/dev-brand-defaults/public-brand-defaults.v1.json': path.join(
        root,
        'packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json',
      ),
      '@glc/dev-brand-defaults': path.join(root, 'packages/glc-dev-brand-defaults/src/index.ts'),
      '@glc/web-app/api-paths': path.join(root, 'packages/glc-api-paths/src/index.ts'),
      '@glc/api-paths': path.join(root, 'packages/glc-api-paths/src/index.ts'),
      '@glc/route-limits': path.join(root, 'packages/glc-route-limits/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    // Minimal placeholders so modules that import `supabase` can load in unit tests.
    env: {
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_KEY: 'vitest-placeholder-service-role-key',
    },
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      reportsDirectory: './coverage/server',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/tests/**',
        'src/snapshot/**',
        '**/*.d.ts',
      ],
    },
  },
});
