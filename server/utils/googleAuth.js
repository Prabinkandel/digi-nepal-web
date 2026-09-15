const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');
const { production } = require('../config/runtime');

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const sessionLifetime = 10 * 60 * 1000;

function configured() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && (!production || process.env.APP_URL)); }
function redirectUri(req) { return process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || `${req.protocol}://${req.get('host')}`}/api/auth/google/callback`; }
function sameValue(a, b) { const left = Buffer.from(String(a)); const right = Buffer.from(String(b)); return left.length === right.length && timingSafeEqual(left, right); }
function start(req) {
  const state = randomBytes(32).toString('base64url'); const verifier = randomBytes(48).toString('base64url');
  req.session.googleOAuth = { state, verifier, expires: Date.now() + sessionLifetime };
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(req), response_type: 'code', scope: 'openid email profile', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
  return url.toString();
}
async function finish(req, code, state) {
  const pending = req.session.googleOAuth; delete req.session.googleOAuth;
  if (!pending || pending.expires < Date.now() || !sameValue(pending.state, state)) throw Object.assign(new Error('Google sign-in session expired. Try again.'), { status: 400 });
  const body = new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(req), grant_type: 'authorization_code', code_verifier: pending.verifier });
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.id_token) throw Object.assign(new Error('Google could not complete sign-in. Please try again.'), { status: 401 });
  const claimsResponse = await fetch(`${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(token.id_token)}`);
  const claims = await claimsResponse.json().catch(() => ({})); const validIssuer = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  if (!claimsResponse.ok || !validIssuer || claims.aud !== process.env.GOOGLE_CLIENT_ID || claims.email_verified !== 'true' || !claims.email || !claims.sub) throw Object.assign(new Error('Google returned an invalid identity. Please try again.'), { status: 401 });
  return { email: String(claims.email).trim().toLowerCase(), name: String(claims.name || claims.given_name || claims.email.split('@')[0]).slice(0, 100), subject: claims.sub };
}
module.exports = { configured, start, finish };
