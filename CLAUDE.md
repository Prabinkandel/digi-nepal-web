# Digi Nepal — Project Architecture & Context for Claude Code

## Project Overview
Digi Nepal is a full-stack digital marketplace for software subscriptions in Nepal with local payment workflows (eSewa, Khalti, Bank Transfer), customer OTP authentication, admin order fulfillment, and automated Gmail notifications.

---

## Tech Stack
- **Runtime**: Node.js (>=18.x)
- **Backend**: Express 4.21, Mongoose 8.12, Connect-Mongo 5.1, CSRF-Sync 4.0, Nodemailer 6.10, Sharp 0.33, Zod 3.24, Helmet 8.0, Rate-Limiter-Flexible
- **Frontend**: Vanilla HTML5, Vanilla JavaScript (`app.js`, `admin.js`), Vanilla CSS (`tokens.css`, `style.css`, `pages.css`, `storefront-polish.css`, `admin.css`)
- **Deployment**: Vercel Serverless Function (`api/index.js`), Static CDN Output (`dist/`)
- **Database**: MongoDB Atlas (`diginepal.yabfaud.mongodb.net`) + `mongodb-memory-server` in development fallback / test

---

## Essential Commands
```bash
npm start          # Run local server on http://localhost:3001
npm run dev        # Alias for npm start
npm run build      # Build public site into dist/ (runs server/scripts/build.js)
npm test           # Run automated tests (node --test tests/*.test.js)
npm run lint       # Run ESLint (eslint .)
npm run admin:create # CLI script to create an admin user
```

---

## Directory Structure
```
├── api/
│   └── index.js             # Vercel serverless entry point (exports server/server.js)
├── server/
│   ├── server.js            # Express app, middleware, routes, startup
│   ├── config/
│   │   ├── db.js            # Mongoose connection, reconnects, auto-seeding, DNS fix
│   │   └── runtime.js       # Production env validation
│   ├── middleware/
│   │   ├── access.js        # Role-based access control (admin, editor)
│   │   ├── adminAuth.js     # Admin-only gate
│   │   ├── auth.js          # User session verification
│   │   ├── csrf.js          # CSRF-Sync token generator & protection
│   │   └── limits.js        # MongoDB-backed rate limiting
│   ├── models/              # User, Product, Category, Order, Payment, Media, Setting, Otp, Challenge, Audit
│   ├── routes/              # auth, products, categories, orders, payments, offers, upload, media, settings, users, contact
│   ├── scripts/             # build.js, createAdmin.js, migrateToMongo.js, seedProducts.js, testDb.js
│   └── utils/               # catalog, googleAuth, mailer, mfa, settings, validation
├── dist/                    # Production build output deployed to Vercel CDN
├── tests/                   # Automated tests (auth, order, upload, payment)
├── app.js                   # Main customer storefront logic
├── admin.js                 # Admin dashboard SPA logic
├── index.html               # Main storefront
├── admin.html               # Admin portal
├── vercel.json              # Vercel routing, build command, headers
├── .env                     # Local environment secrets (NEVER commit)
└── .env.example             # Documented template for environment variables
```

---

## Database & Models
- **Database Name**: `diginepal`
- **Atlas Host**: `diginepal.yabfaud.mongodb.net`
- **DNS Fix**: `dns.setServers(['8.8.8.8', '1.1.1.1'])` is executed at the top of `server.js` and `db.js` to prevent local Windows/ISP `querySrv ECONNREFUSED` errors.
- **Development Fallback**: In `NODE_ENV !== 'production'`, if Atlas connection fails, `db.js` automatically starts `mongodb-memory-server` in `.local-data/mongodb` so local dev never breaks.
- **Seeded Data**:
  - Admins: `admin@diginepal.com` (password: `admin123`), `prabink721@gmail.com`
  - 5 default subscription categories (AI Tools, Design & Media, Cloud & Office, Entertainment, Security & VPN)
  - 5 default catalog products

---

## Authentication & Security Mechanics
1. **Customer Login**:
   - Email OTP login (`/api/auth/send-otp` -> 6-digit code -> `/api/auth/login-otp`).
   - Password login (`/api/auth/login`) with optional TOTP MFA.
   - Google OAuth (`/api/auth/google/start` and `/api/auth/google/callback`).
2. **CSRF Protection**:
   - `csrfSynchronisedProtection` protects all state-changing API calls.
   - **Exempt from CSRF**: `/api/auth/csrf` (GET) and public auth POSTs: `/login`, `/register`, `/send-otp`, `/login-otp`, `/verify-otp`, `/forgot-password`, `/reset-password`.
   - Frontend passes `x-csrf-token` header obtained from `/api/auth/csrf`.
3. **Sessions**:
   - Stored in MongoDB via `connect-mongo` in production; `MemoryStore` in tests/fallback.
   - Cookie name: `__Host-dn.sid` in production (`dn.sid` in dev); `sameSite: 'lax'`, `httpOnly: true`.
4. **Origin Protection**:
   - Non-GET `/api` requests check origin against `hostHeader`, `process.env.APP_URL`, `localhost`, and `*.vercel.app`.
   - `app.set('trust proxy', 1)` is enabled on Vercel and production.

---

## File Uploads & Media
- Uploads (`/api/upload`) accept PNG, JPG, WebP images via `multer.memoryStorage()`.
- Processed by `sharp`: rotated, resized to max 2000x2000, compressed to WebP (quality 90).
- Stored as binary Buffer in MongoDB `Media` collection (NOT on disk, ensuring 100% serverless Vercel compatibility).
- Served at `/api/media/:id`.
  - Public if attached to a catalog product or setting.
  - Protected (owner or admin) if purpose is `receipt`.

---

## Email & Notifications
- `server/utils/mailer.js`:
  - Uses Gmail SMTP (`smtp.gmail.com:465`) with Google App Passwords.
  - Sends customer login OTPs, order confirmation emails, and admin alert emails when orders are placed or payment receipts are uploaded.
  - When SMTP is unconfigured, enters `devMode` and outputs OTP to console/toast.

---

## Vercel Serverless Architecture
- `outputDirectory`: `dist`
- `buildCommand`: `npm run build`
- `functions`: `api/index.js` (includes `server/**`)
- `rewrites`:
  - `/api/(.*)` -> `/api/index.js`
  - `/uploads/(.*)` -> `/api/index.js`
  - Static HTML page routes (`/about`, `/contact`, `/privacy`, `/terms`, `/refund`, `/admin`) -> corresponding `.html`
- Static headers: Cache-Control immutable for CSS/JS/PNG; no-store for `/api/(.*)`.

---

## Critical Rules for Code Modifications
1. **Never write files to disk for uploads**: Vercel serverless has a read-only filesystem (except `/tmp`). Store media in MongoDB `Media` collection.
2. **Never break CSRF whitelist**: Any public authentication endpoints must be included in the regex whitelist in `server/server.js`.
3. **Preserve DNS server config**: Do not remove `dns.setServers(['8.8.8.8', '1.1.1.1'])` from `server.js` or `db.js`.
4. **Always run verification**: Run `npm run lint` and `npm test` before pushing to `main`.
