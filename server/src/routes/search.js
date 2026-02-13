const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/search?q=
router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q || q.trim().length < 2) {
      return res.json({ tickets: [], customers: [], parts: [] });
    }

    const storeId = req.user.storeId;
    const pattern = `%${q.trim()}%`;

    const [tickets, customers, parts] = await Promise.all([
      db.many(
        `SELECT t.id, t.ticket_number, t.device_type, t.device_brand, t.device_model,
                t.issue_description, t.status, c.name as customer_name
         FROM tickets t
         JOIN customers c ON t.customer_id = c.id
         WHERE t.store_id = $1 AND (
           CAST(t.ticket_number AS TEXT) ILIKE $2
           OR c.name ILIKE $2
           OR t.device_brand ILIKE $2
           OR t.device_model ILIKE $2
           OR t.issue_description ILIKE $2
         )
         ORDER BY t.created_at DESC LIMIT 10`,
        [storeId, pattern]
      ),
      db.many(
        `SELECT id, name, email, phone
         FROM customers
         WHERE store_id = $1 AND (name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
         ORDER BY name LIMIT 10`,
        [storeId, pattern]
      ),
      db.many(
        `SELECT id, name, sku, quantity, sell_price
         FROM parts
         WHERE store_id = $1 AND (name ILIKE $2 OR sku ILIKE $2)
         ORDER BY name LIMIT 10`,
        [storeId, pattern]
      ),
    ]);

    res.json({ tickets, customers, parts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
