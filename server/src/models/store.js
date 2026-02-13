const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async create({ name, address, phone, email }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO stores (id, name, address, phone, email) VALUES ($1, $2, $3, $4, $5)`,
      [id, name, address || null, phone || null, email || null]
    );
    return { id, name, address, phone, email };
  },

  async findById(id) {
    return db.one('SELECT * FROM stores WHERE id = $1', [id]);
  },

  async update(id, fields) {
    const allowed = ['name', 'address', 'phone', 'email', 'tax_rate', 'warranty_days', 'warranty_terms', 'receipt_footer', 'logo_url', 'organization_id', 'stripe_secret_key', 'stripe_publishable_key', 'stripe_webhook_secret'];
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
    if (!sets.length) return this.findById(id);

    params.push(id);
    await db.run(`UPDATE stores SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return this.findById(id);
  },

  async getStripeKeys(storeId) {
    return db.one(
      'SELECT stripe_secret_key, stripe_publishable_key, stripe_webhook_secret FROM stores WHERE id = $1',
      [storeId]
    );
  },
};
