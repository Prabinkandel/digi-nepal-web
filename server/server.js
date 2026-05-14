const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/offers',     require('./routes/offers'));
app.use('/api/upload',     require('./routes/upload'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/payments',   require('./routes/payments'));
app.use('/api/settings',   require('./routes/settings'));


// ── SPA FALLBACK ──────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

// ── START ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Digi Nepal server running at http://localhost:${PORT}`);
    console.log(`📦 API endpoints at http://localhost:${PORT}/api`);
    console.log(`🖥️  Admin panel at http://localhost:${PORT}/admin`);
    console.log(`\n👤 Admin login: admin@diginepal.com / admin123\n`);
  });
}

module.exports = app;
