const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  findByStore(storeId, { search } = {}) {
    if (search) {
      const pattern = `%${search}%`;
      return db.prepare(
        `SELECT * FROM customers WHERE store_id = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ?) ORDER BY name`
      ).all(storeId, pattern, pattern, pattern);
    }
    return db.prepare('SELECT * FROM customers WHERE store_id = ? ORDER BY name').all(storeId);
  },

  findById(id, storeId) {
    return db.prepare('SELECT * FROM customers WHERE id = ? AND store_id = ?').get(id, storeId);
  },

  create({ storeId, name, email, phone }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO customers (id, store_id, name, email, phone) VALUES (?, ?, ?, ?, ?)`
    ).run(id, storeId, name, email || null, phone || null);
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  },

  update(id, storeId, { name, email, phone }) {
    const result = db.prepare(
      `UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ? AND store_id = ?`
    ).run(name, email || null, phone || null, id, storeId);
    if (result.changes === 0) return null;
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  },
};
