const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');
const storeModel = require('../models/store');
const { required, isValidEmail } = require('../utils/validation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function generateTokens(user) {
  const payload = { id: user.id, storeId: user.store_id, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/register - Register new store + admin user
router.post('/register', async (req, res, next) => {
  try {
    const { storeName, email, password, name } = req.body;
    const err = required(['storeName', 'email', 'password', 'name'], req.body);
    if (err) return res.status(400).json({ error: err });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const store = await storeModel.create({ name: storeName });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      storeId: store.id,
      email,
      passwordHash,
      name,
      role: 'admin',
    });

    const tokens = generateTokens(user);
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...tokens });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const err = required(['email', 'password'], req.body);
    if (err) return res.status(400).json({ error: err });

    const user = await userModel.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const tokens = generateTokens(user);
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.store_id }, ...tokens });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userModel.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
