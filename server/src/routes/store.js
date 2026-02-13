const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/store — get current store settings
router.get('/', async (req, res, next) => {
  try {
    const store = await db.one('SELECT * FROM stores WHERE id = $1', [req.user.storeId]);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
  } catch (err) {
    next(err);
  }
});

// PUT /api/store — update store settings (admin only)
router.put('/', authorize('admin'), async (req, res, next) => {
  try {
    const allowed = ['name', 'address', 'phone', 'email', 'tax_rate', 'warranty_days', 'warranty_terms', 'receipt_footer', 'logo_url'];
    const sets = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(req.body)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col)) {
        sets.push(`${col} = $${idx++}`);
        params.push(value);
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(req.user.storeId);
    await db.run(`UPDATE stores SET ${sets.join(', ')} WHERE id = $${idx}`, params);

    const store = await db.one('SELECT * FROM stores WHERE id = $1', [req.user.storeId]);
    res.json(store);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
