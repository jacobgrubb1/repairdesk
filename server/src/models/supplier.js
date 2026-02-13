const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByStore(storeId, { search } = {}) {
    let query = 'SELECT * FROM suppliers WHERE store_id = $1';
    const params = [storeId];
    let idx = 2;
    if (search) {
      query += ` AND (name ILIKE $${idx} OR contact_name ILIKE $${idx + 1} OR email ILIKE $${idx + 2})`;
      const p = `%${search}%`;
      params.push(p, p, p);
      idx += 3;
    }
    query += ' ORDER BY name ASC';
    return db.many(query, params);
  },

  async findById(id, storeId) {
    return db.one('SELECT * FROM suppliers WHERE id = $1 AND store_id = $2', [id, storeId]);
  },

  async create({ storeId, name, contactName, email, phone, address }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO suppliers (id, store_id, name, contact_name, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, storeId, name, contactName || null, email || null, phone || null, address || null]
    );
    return this.findById(id, storeId);
  },

  async update(id, storeId, fields) {
    const allowed = ['name', 'contact_name', 'email', 'phone', 'address'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col)) {
        sets.push(`${col} = $${idx}`);
        params.push(value);
        idx++;
      }
    }
    if (!sets.length) return this.findById(id, storeId);
    params.push(id, storeId);
    await db.run(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1}`, params);
    return this.findById(id, storeId);
  },

  async delete(id, storeId) {
    return db.run('DELETE FROM suppliers WHERE id = $1 AND store_id = $2', [id, storeId]);
  },
};
