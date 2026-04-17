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
      /** Library-style snapshot engine; still compiled by tsc, skipped for ESLint noise. */
      'server/src/snapshot/**',
      'coverage/**',
      'e2e/playwright-report/**',
      'e2e/test-results/**',
      '**/*.config.ts',
      'eslint.config.js',
      '.claude/**',
      '.claire/**',
      '**/*.test.ts',
      'server/src/tests/**',
      'server/scripts/**',
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
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
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
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/src/intake', '**/server/src/intake/**'],
              message: 'Import intake from @glc/intake-core instead of server/src/intake.',
            },
          ],
        },
      ],
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
  {
    files: ['src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,8})$/]",
          message: 'Raw HEX colors are not allowed. Use design system tokens/variables.',
        },
        {
          selector: "Literal[value=/^rgba?\\(/i]",
          message: 'Raw rgb/rgba colors are not allowed. Use design system tokens/variables.',
        },
        {
          selector: "Literal[value=/^hsla?\\(/i]",
          message: 'Raw hsl/hsla colors are not allowed. Use design system tokens/variables.',
        },
        {
          selector: "Literal[value=/^\\d*\\.?\\d+(px|rem|em)$/]",
          message:
            'Raw spacing/size values are not allowed in DS/UI layers. Use spacing/typography/radius tokens.',
        },
      ],
    },
  },
  {
    files: [
      'src/app/config/**/*.{ts,tsx}',
      'src/app/components/app-shell/**/*.{ts,tsx}',
      'src/app/pages/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,8})$/]",
          message: 'Prefer design tokens over raw HEX colors.',
        },
        {
          selector: "Literal[value=/^rgba?\\(/i]",
          message: 'Prefer semantic/tokenized overlays over raw rgb/rgba colors.',
        },
        {
          selector: "Literal[value=/^hsla?\\(/i]",
          message: 'Prefer design tokens over raw hsl/hsla colors.',
        },
      ],
    },
  },
);
