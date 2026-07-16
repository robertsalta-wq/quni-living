/**
 * Blocking carve-out: only react-hooks/rules-of-hooks.
 * Full lint stays advisory (see .github/workflows/ci.yml + TECH_DEBT.md).
 * This config must fail CI on conditional / post-return hooks — the class of bug
 * that shipped as React #310 on landlord booking review.
 *
 * Other plugins are registered (rules off) so existing eslint-disable comments
 * that name those rules do not fail this carve-out with "rule was not found".
 */
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'coverage',
    'playwright-report',
    'test-results',
    'android/**',
    'ios/**',
    'supabase/functions/**',
  ]),
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      // Advisory full lint covers deps; do not block merges on them.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])
