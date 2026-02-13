const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByTicket(ticketId) {
    return db.one('SELECT * FROM warranties WHERE ticket_id = $1', [ticketId]);
  },

  async create({ ticketId, storeId, warrantyDays, warrantyTerms }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO warranties (id, ticket_id, store_id, warranty_days, warranty_terms, start_date)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, ticketId, storeId, warrantyDays, warrantyTerms || null]
    );
    return db.one('SELECT * FROM warranties WHERE id = $1', [id]);
  },

  async update(id, { warrantyDays, warrantyTerms }) {
    const sets = [];
    const params = [];
    let idx = 1;
    if (warrantyDays !== undefined) { sets.push(`warranty_days = $${idx}`); params.push(warrantyDays); idx++; }
    if (warrantyTerms !== undefined) { sets.push(`warranty_terms = $${idx}`); params.push(warrantyTerms); idx++; }
    if (!sets.length) return;
    params.push(id);
    await db.run(`UPDATE warranties SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return db.one('SELECT * FROM warranties WHERE id = $1', [id]);
  },

  async checkWarrantyReturn(storeId, customerId, deviceBrand, deviceModel) {
    return db.many(
      `SELECT w.*, t.ticket_number, t.issue_description, t.device_brand, t.device_model, t.completed_at
       FROM warranties w
       JOIN tickets t ON w.ticket_id = t.id
       WHERE t.store_id = $1 AND t.customer_id = $2 AND t.device_brand = $3 AND t.device_model = $4
         AND t.status IN ('completed', 'picked_up')
         AND w.start_date + (w.warranty_days || ' days')::INTERVAL >= NOW()
       ORDER BY w.start_date DESC`,
      [storeId, customerId, deviceBrand, deviceModel]
    );
  },

  async getActiveWarranties(storeId) {
    return db.many(
      `SELECT w.*, t.ticket_number, t.device_brand, t.device_model, t.issue_description,
              c.name as customer_name, c.phone as customer_phone,
              w.start_date + (w.warranty_days || ' days')::INTERVAL as expires_at
       FROM warranties w
       JOIN tickets t ON w.ticket_id = t.id
       JOIN customers c ON t.customer_id = c.id
       WHERE w.store_id = $1
         AND w.start_date + (w.warranty_days || ' days')::INTERVAL >= NOW()
       ORDER BY expires_at ASC`,
      [storeId]
    );
  },
};
