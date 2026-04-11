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
      '@glc/intake-core/lint-node': path.join(root, 'packages/intake-core/src/lint-node.ts'),
      '@glc/intake-core': path.join(root, 'packages/intake-core/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      reportsDirectory: './coverage/server',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/tests/**',
        '**/*.d.ts',
      ],
    },
  },
});
