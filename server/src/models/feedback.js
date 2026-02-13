const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByTicket(ticketId) {
    return db.one('SELECT * FROM ticket_feedback WHERE ticket_id = $1', [ticketId]);
  },

  async findByStore(storeId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const items = await db.many(
      `SELECT f.*, t.ticket_number, c.name as customer_name
       FROM ticket_feedback f
       JOIN tickets t ON f.ticket_id = t.id
       JOIN customers c ON t.customer_id = c.id
       WHERE f.store_id = $1
       ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
      [storeId, limit, offset]
    );
    const row = await db.one('SELECT COUNT(*) as count FROM ticket_feedback WHERE store_id = $1', [storeId]);
    return { items, total: parseInt(row.count), page, limit };
  },

  async create({ ticketId, storeId, rating, comment }) {
    const existing = await this.findByTicket(ticketId);
    if (existing) return existing;
    const id = uuidv4();
    await db.run(
      `INSERT INTO ticket_feedback (id, ticket_id, store_id, rating, comment) VALUES ($1, $2, $3, $4, $5)`,
      [id, ticketId, storeId, rating, comment || null]
    );
    return db.one('SELECT * FROM ticket_feedback WHERE id = $1', [id]);
  },

  async getStoreAverage(storeId) {
    return db.one(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
       FROM ticket_feedback WHERE store_id = $1`,
      [storeId]
    );
  },
};
