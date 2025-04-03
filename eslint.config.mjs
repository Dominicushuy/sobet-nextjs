import globals from 'globals';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';

export default [
  // Cấu hình global
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // Cấu hình React
  {
    ...pluginReactConfig,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Prettier plugin
  {
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': [
        'warn',
        {
          singleQuote: true,
          semi: true,
          trailingComma: 'es5',
        },
      ],
    },
  },

  // Quy tắc cơ bản
  js.configs.recommended,

  // Tùy chỉnh rules
  {
    rules: {
      // React rules
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',

      // Styling rules
      'no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Best practices
      eqeqeq: 'error',
      'no-duplicate-imports': 'error',

      // Potential errors
      'no-empty': 'warn',
      'no-extra-boolean-cast': 'warn',

      // Spacing and formatting
      indent: ['warn', 2],
      semi: ['error', 'always'],
      quotes: ['warn', 'single'],
    },
  },

  // Ignore files
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/build/**', '**/dist/**'],
  },
];
