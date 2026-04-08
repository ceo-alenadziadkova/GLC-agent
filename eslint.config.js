import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
      'e2e/playwright-report/**',
      'e2e/test-results/**',
      '**/*.config.ts',
      'eslint.config.js',
      '.claude/**',
      '.claire/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      'server/src/tests/**',
      'server/scripts/**',
      'src/**/__tests__/**',
    ],
  },
  {
    languageOptions: {
      globals: { ...globals.es2022 },
    },
    rules: {
      'prefer-const': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unused-expressions': [
        'warn',
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],
    },
  },
  {
    files: ['server/src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },
  {
    files: ['src/**/*.{tsx,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
