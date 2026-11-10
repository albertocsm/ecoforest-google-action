'use strict';

const google = require('eslint-config-google');
const jsdoc = require('eslint-plugin-jsdoc');
const globals = require('globals');

// ESLint removed these core rules; their supported replacements are below.
const googleRules = {...google.rules};
delete googleRules['valid-jsdoc'];
delete googleRules['require-jsdoc'];

module.exports = [{
  files: ['**/*.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: globals.node,
  },
  plugins: {jsdoc},
  rules: {
    ...googleRules,
    'no-unused-vars': 'warn',
    'jsdoc/require-jsdoc': ['error', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
      },
    }],
    'jsdoc/check-tag-names': 'error',
    'jsdoc/check-types': 'error',
    'jsdoc/check-param-names': 'error',
  },
}];
