const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByTicket(ticketId) {
    return db.many(
      `SELECT p.*, u.name as taken_by_name
       FROM ticket_photos p LEFT JOIN users u ON p.taken_by = u.id
       WHERE p.ticket_id = $1 ORDER BY p.created_at ASC`,
      [ticketId]
    );
  },

  async create({ ticketId, storeId, url, caption, photoType, takenBy }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO ticket_photos (id, ticket_id, store_id, url, caption, photo_type, taken_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, ticketId, storeId, url, caption || null, photoType, takenBy || null]
    );
    return db.one('SELECT * FROM ticket_photos WHERE id = $1', [id]);
  },

  async delete(id, storeId) {
    return db.run('DELETE FROM ticket_photos WHERE id = $1 AND store_id = $2', [id, storeId]);
  },
};
