const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendMail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'toolsvault-super-secret-2024';
const sign = (user) => jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

// Register (Send OTP)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    const lowerEmail = email.toLowerCase();
    const exists = await User.findOne({ email: lowerEmail });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60000;

    await Otp.deleteMany({ email: lowerEmail });
    await Otp.create({ email: lowerEmail, code: otpCode, expires_at: expiresAt });

    await sendMail({
      from: '"ToolsVault Security" <no-reply@toolsvault.com>',
      to: email,
      subject: 'Your ToolsVault Verification Code',
      text: `Hello ${name},\n\nYour verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`,
      html: `<h2>Welcome to ToolsVault!</h2><p>Hello ${name},</p><p>Your verification code is: <b style="font-size:24px;color:#3b82f6;">${otpCode}</b></p><p>This code will expire in 10 minutes.</p>`
    });
    res.json({ requires_otp: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const lowerEmail = email.toLowerCase();
    const record = await Otp.findOne({ email: lowerEmail });
    if (!record) return res.status(400).json({ error: 'No pending OTP found for this email. Please register again.' });
    if (record.code !== otp.toString().trim()) return res.status(400).json({ error: 'Invalid OTP code' });
    if (Date.now() > record.expires_at) return res.status(400).json({ error: 'OTP has expired.' });

    const hash = bcrypt.hashSync(password, 10);
    const user = await User.create({
      id: uuidv4(),
      name: name.trim(),
      email: lowerEmail,
      password: hash,
      role: 'user'
    });
    
    await Otp.deleteMany({ email: lowerEmail });

    res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.is_active === 0) return res.status(403).json({ error: 'Account disabled. Contact support.' });
    
    res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('id name email role created_at');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
