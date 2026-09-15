const nodemailer = require('nodemailer');
let transport;
function usesGmailOAuth() { return Boolean(process.env.GMAIL_OAUTH_EMAIL && process.env.GMAIL_OAUTH_CLIENT_ID && process.env.GMAIL_OAUTH_CLIENT_SECRET && process.env.GMAIL_OAUTH_REFRESH_TOKEN); }
function configured() { return usesGmailOAuth() || !!((process.env.SMTP_HOST || process.env.EMAIL_USER) && (process.env.SMTP_USER || process.env.EMAIL_USER) && (process.env.SMTP_PASS || process.env.EMAIL_PASS)); }
async function sendMail(options) {
  if (!configured()) throw Object.assign(new Error('Email is not configured. Contact the site administrator.'), { status: 503 });
  if (!transport) transport = usesGmailOAuth() ? nodemailer.createTransport({ service: 'gmail', auth: { type: 'OAuth2', user: process.env.GMAIL_OAUTH_EMAIL, clientId: process.env.GMAIL_OAUTH_CLIENT_ID, clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET, refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN } }) : nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port: Number(process.env.SMTP_PORT || 465), secure: (process.env.SMTP_PORT || '465') === '465', requireTLS: true, auth: { user: process.env.SMTP_USER || process.env.EMAIL_USER, pass: process.env.SMTP_PASS || process.env.EMAIL_PASS } });
  return transport.sendMail({ ...options, from: process.env.SMTP_FROM || process.env.GMAIL_OAUTH_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER });
}
module.exports = { sendMail, configured };
