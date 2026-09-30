const path = require('path');
require('dotenv').config({ path: [path.join(__dirname, '../.env'), path.join(__dirname, '.env')], quiet: true });
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { csrfSynchronisedProtection } = require('./middleware/csrf');

const connectDB = require('./config/db');

const databaseReady = connectDB();

const app = express();
const PORT = process.env.PORT || 3001;
const connectMongo = require('connect-mongo');
const MongoStoreClass = connectMongo.default || connectMongo;

const sessionStore = process.env.MONGO_URI
  ? (MongoStoreClass.create 
      ? MongoStoreClass.create({ mongoUrl: process.env.MONGO_URI, stringify: false }) 
      : new (connectMongo(session))({ url: process.env.MONGO_URI, stringify: false }))
  : new session.MemoryStore();

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'https:', 'data:'], connectSrc: ["'self'"],
    objectSrc: ["'none'"], baseUri: ["'none'"], formAction: ["'self'"], frameAncestors: ["'none'"]
  }},
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'no-referrer' }
}));
app.use((req, res, next) => databaseReady.then(() => next(), next));
app.use(express.json({ limit: '128kb' }));
app.use(express.urlencoded({ limit: '128kb', extended: false }));
app.use(session({
  name: process.env.NODE_ENV === 'production' ? '__Host-dn.sid' : 'dn.sid',
  secret: process.env.SESSION_SECRET || 'development-local-secret-change-me-please',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000
  }
}));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const origin = process.env.APP_URL || (req.protocol + '://' + req.get('host'));
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') && req.get('origin') !== origin) {
    return res.status(403).json({ error: 'This request came from another site.' });
  }
  next();
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
// Authentication requests establish a session; all other state-changing API calls require a per-session CSRF token.
app.use('/api', (req, res, next) => {
  const publicAuthAction = req.method === 'POST' && /^\/auth\/(login|register|verify-otp|forgot-password|reset-password)$/.test(req.path);
  if (publicAuthAction || (req.method === 'GET' && req.path === '/auth/csrf')) return next();
  return csrfSynchronisedProtection(req, res, next);
});
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/offers',     require('./routes/offers'));
app.use('/api/upload',     require('./routes/upload'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/payments',   require('./routes/payments'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/media',      require('./routes/media'));


// ── CONTACT API ───────────────────────────────────────────────────────────────
app.use('/api/contact',    require('./routes/contact'));

// ── STATIC PAGES ──────────────────────────────────────────────────────────────
const staticPages = { '/about': 'about.html', '/contact': 'contact.html', '/privacy': 'privacy.html', '/terms': 'terms.html', '/refund': 'refund.html', '/admin': 'admin.html' };
for (const [route, file] of Object.entries(staticPages)) {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, '..', file)));
}

// Keep API failures machine-readable and avoid exposing stack traces or internals.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (req.path.startsWith('/api/')) {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status === 500) console.error('[API 500 ERROR]', req.method, req.path, error);
    return res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
  }
  return next(error);
});
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '../index.html')));

// ── START ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  databaseReady.then(() => app.listen(PORT, () => {
    console.log(`\n🚀 Digi Nepal server running at http://localhost:${PORT}`);
    console.log(`📦 API endpoints at http://localhost:${PORT}/api`);
    console.log(`🖥️  Admin panel at http://localhost:${PORT}/admin`);
  })).catch(() => { console.error('Database startup failed. Check MONGO_URI and network access.'); process.exitCode = 1; });
}

module.exports = app;
