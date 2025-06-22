module.exports = {
  extends: [
    '../../.eslintrc.js',
    'next/core-web-vitals'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
}