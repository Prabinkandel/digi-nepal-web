const path = require('node:path');
require('dotenv').config({ path: [path.join(__dirname, '../../.env'), path.join(__dirname, '../.env')], quiet: true });
const production = process.env.NODE_ENV === 'production';
function validate() {
  for (const name of ['MONGO_URI','SESSION_SECRET']) if (!process.env[name]) throw new Error(name + ' must be configured.');
  if (process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  if (production && (!process.env.APP_URL?.startsWith('https://') || !process.env.MFA_ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY.length < 32)) throw new Error('Production requires HTTPS APP_URL and MFA_ENCRYPTION_KEY of at least 32 characters.');
  if (process.env.APP_URL && new URL(process.env.APP_URL).origin !== process.env.APP_URL) throw new Error('APP_URL must be an origin without a trailing slash.');
}
module.exports = { production, validate };
