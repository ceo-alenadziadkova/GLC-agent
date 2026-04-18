import { defineConfig, mergeConfig } from 'vitest/config';
import type { ConfigEnv, UserConfig } from 'vite';
import viteConfigExport from './vite.config';

const viteTestEnv: ConfigEnv = {
  command: 'serve',
  mode: 'test',
  isSsrBuild: false,
};

const resolvedVite: UserConfig =
  typeof viteConfigExport === 'function'
    ? (viteConfigExport as (env: ConfigEnv) => UserConfig)(viteTestEnv)
    : (viteConfigExport as UserConfig);

export default mergeConfig(resolvedVite, defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'packages/intake-core/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      reportsDirectory: './coverage/frontend',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        '**/*.d.ts',
      ],
    },
  },
}));
