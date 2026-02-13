const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByTicket(ticketId) {
    return db.many(
      `SELECT p.*, u.name as created_by_name
       FROM payments p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.ticket_id = $1
       ORDER BY p.created_at ASC`,
      [ticketId]
    );
  },

  async create({ ticketId, storeId, amount, method, note, createdBy, stripeSessionId, stripePaymentIntentId }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO payments (id, ticket_id, store_id, amount, method, note, created_by, stripe_session_id, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, ticketId, storeId, parseFloat(amount), method, note || null, createdBy || null, stripeSessionId || null, stripePaymentIntentId || null]
    );
    return db.one(
      `SELECT p.*, u.name as created_by_name
       FROM payments p LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );
  },

  async delete(id, ticketId) {
    await db.run('DELETE FROM payments WHERE id = $1 AND ticket_id = $2', [id, ticketId]);
  },

  async getTotalPaid(ticketId) {
    const row = await db.one(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ticket_id = $1',
      [ticketId]
    );
    return parseFloat(row.total);
  },

  async getStorePayments(storeId, month, year) {
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;
    return db.many(
      `SELECT method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE store_id = $1 AND to_char(created_at, 'YYYY-MM') = $2
       GROUP BY method`,
      [storeId, datePrefix]
    );
  },
};
