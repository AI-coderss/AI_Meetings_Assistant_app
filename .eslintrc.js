module.exports = {
  root: true,
  env: { node: true, es2021: true, browser: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'prettier'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended'],
  settings: { react: { version: 'detect' } },
  rules: {
    'no-console': 'off',
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
}
