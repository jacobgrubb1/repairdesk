const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const userModel = require('../models/user');
const storeModel = require('../models/store');
const { required, isValidEmail, validatePassword } = require('../utils/validation');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const templates = require('../utils/emailTemplates');

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
};

async function generateTokens(user) {
  const store = await storeModel.findById(user.store_id);
  const payload = {
    id: user.id,
    storeId: user.store_id,
    role: user.role,
    orgRole: user.org_role || null,
    orgId: store?.organization_id || null,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

function setCookies(res, accessToken, refreshToken) {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTS,
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { storeName, email, password, name } = req.body;
    const err = required(['storeName', 'email', 'password', 'name'], req.body);
    if (err) return res.status(400).json({ error: err });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const store = await storeModel.create({ name: storeName });
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await userModel.create({
      storeId: store.id,
      email,
      passwordHash,
      name,
      role: 'admin',
      emailVerified: 0,
      verificationToken,
    });

    const tokens = await generateTokens(user);
    setCookies(res, tokens.accessToken, tokens.refreshToken);

    // Send welcome email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email/${verificationToken}`;
    const emailData = templates.welcomeEmail({ name, verifyUrl });
    sendEmail({ to: email, ...emailData });

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
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

    const user = await db.one('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.is_active === 0) return res.status(403).json({ error: 'Account deactivated. Contact your administrator.' });

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked. Please try again later.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await db.run(
        `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [updates.failed_login_attempts, updates.locked_until || null, user.id]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on success
    await db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    const tokens = await generateTokens(user);
    setCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.store_id } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userModel.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const tokens = await generateTokens(user);
    setCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.store_id } });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.clearCookie('csrfToken');
  res.json({ success: true });
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

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const user = await db.one('SELECT id FROM users WHERE verification_token = $1', [req.params.token]);
    if (!user) return res.status(400).json({ error: 'Invalid verification token' });

    await db.run('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = $1', [user.id]);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Always return 200 to prevent email enumeration
    const user = await db.one('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await db.run('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [resetToken, expires, user.id]);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
      const emailData = templates.passwordResetEmail({ name: user.name, resetUrl });
      sendEmail({ to: user.email, ...emailData });
    }

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/verify-reset-token/:token
router.get('/verify-reset-token/:token', async (req, res, next) => {
  try {
    const user = await db.one(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [req.params.token]
    );
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    res.json({ valid: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const user = await db.one(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 10);
    await db.run(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
