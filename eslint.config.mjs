import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'dist/**',
      'main/dist/**',
      'docs/**',
      'node_modules/**',
      'scripts/.verify-out/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Several react-three-fiber components opt out of type checking because R3F's JSX
      // intrinsics are not typed for React 19. Require an explanation on each one.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-nocheck': 'allow-with-description', 'ts-ignore': 'allow-with-description' },
      ],
    },
  },
  {
    // Ambient shims for untyped third-party libraries have to use `any`.
    files: ['src/types/**/*.d.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];

export default config;
