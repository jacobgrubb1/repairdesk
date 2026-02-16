const express = require('express');
const bcrypt = require('bcrypt');
const userModel = require('../models/user');
const { authenticate, authorize } = require('../middleware/auth');
const { required, isValidEmail, validatePassword } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/users — list store staff
router.get('/', async (req, res, next) => {
  try {
    const users = await userModel.findByStore(req.user.storeId);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/users — create staff member
router.post('/', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const err = required(['email', 'password', 'name', 'role'], req.body);
    if (err) return res.status(400).json({ error: err });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!['admin', 'technician', 'front_desk'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      storeId: req.user.storeId,
      email,
      passwordHash,
      name,
      role,
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — update staff member
router.put('/:id', async (req, res, next) => {
  try {
    const user = await userModel.update(req.params.id, req.user.storeId, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/password — admin reset someone's password
router.put('/:id/password', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const passwordHash = await bcrypt.hash(password, 10);
    const db = require('../config/db');
    const result = await db.run(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND store_id = $3',
      [passwordHash, req.params.id, req.user.storeId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
