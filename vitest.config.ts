import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';
import type { ConfigEnv, UserConfig } from 'vite';
import viteConfigExport from './vite.config';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testingLibraryReactEntry = require.resolve('@testing-library/react');

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
  resolve: {
    alias: {
      '@testing-library/react-impl': testingLibraryReactEntry,
      '@testing-library/react': path.join(__dirname, 'src/test/testing-library-react.tsx'),
      // More specific first — plain `gsap` would otherwise swallow `gsap/MotionPathPlugin`.
      'gsap/MotionPathPlugin': path.join(__dirname, 'src/test/gsap-motion-path-plugin-stub.ts'),
      gsap: path.join(__dirname, 'src/test/gsap-vitest-stub.ts'),
    },
  },
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
