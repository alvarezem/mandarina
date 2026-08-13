import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/index.generated.css', 'coverage/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
  },

  {
    files: ['**/*.{js,jsx}'],
    ...react.configs.flat['jsx-runtime'],
  },

  {
    files: ['**/*.{js,jsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // El proyecto descartó TypeScript y no usa PropTypes (ver fase7.md).
      'react/prop-types': 'off',
    },
  },

  {
    files: ['**/*.test.js', '**/*.test.jsx', 'src/setupTests.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },

  {
    // Convención: prefijo `_` = intencionalmente sin usar.
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]
