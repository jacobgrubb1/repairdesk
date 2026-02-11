const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare(
      'SELECT id, store_id, email, name, role, created_at FROM users WHERE id = ?'
    ).get(id);
  },

  create({ storeId, email, passwordHash, name, role }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO users (id, store_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, storeId, email, passwordHash, name, role);
    return { id, store_id: storeId, email, name, role };
  },

  findByStore(storeId) {
    return db.prepare(
      'SELECT id, email, name, role, created_at FROM users WHERE store_id = ? ORDER BY name'
    ).all(storeId);
  },
};
