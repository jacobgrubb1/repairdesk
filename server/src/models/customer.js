const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByStore(storeId, { search } = {}) {
    if (search) {
      const pattern = `%${search}%`;
      return db.many(
        `SELECT * FROM customers WHERE store_id = $1 AND (name ILIKE $2 OR email ILIKE $3 OR phone ILIKE $4) ORDER BY name`,
        [storeId, pattern, pattern, pattern]
      );
    }
    return db.many('SELECT * FROM customers WHERE store_id = $1 ORDER BY name', [storeId]);
  },

  async findById(id, storeId) {
    return db.one('SELECT * FROM customers WHERE id = $1 AND store_id = $2', [id, storeId]);
  },

  async create({ storeId, name, email, phone }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO customers (id, store_id, name, email, phone) VALUES ($1, $2, $3, $4, $5)`,
      [id, storeId, name, email || null, phone || null]
    );
    return db.one('SELECT * FROM customers WHERE id = $1', [id]);
  },

  async update(id, storeId, { name, email, phone }) {
    const result = await db.run(
      `UPDATE customers SET name = $1, email = $2, phone = $3 WHERE id = $4 AND store_id = $5`,
      [name, email || null, phone || null, id, storeId]
    );
    if (result.rowCount === 0) return null;
    return db.one('SELECT * FROM customers WHERE id = $1', [id]);
  },
};
