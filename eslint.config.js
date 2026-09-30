const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'uploads/**', 'scratch/**', '.local-data/**', 'admin.js', 'server/scripts/migrateToMongo.js', 'server/scripts/seedProducts.js', 'server/scripts/testDb.js'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_' }] }
  }
];
