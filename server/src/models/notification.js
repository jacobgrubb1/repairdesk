const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async create({ storeId, userId, ticketId, type, message }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO notifications (id, store_id, user_id, ticket_id, type, message) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, storeId, userId || null, ticketId || null, type, message]
    );
    return { id, store_id: storeId, user_id: userId, ticket_id: ticketId, type, message, is_read: 0 };
  },

  async notifyRole(storeId, role, ticketId, type, message) {
    const users = await db.many('SELECT id FROM users WHERE store_id = $1 AND role = $2 AND is_active = 1', [storeId, role]);
    for (const u of users) {
      await this.create({ storeId, userId: u.id, ticketId, type, message });
    }
  },

  async findForUser(userId, storeId) {
    return db.many(
      `SELECT n.*, t.ticket_number
       FROM notifications n
       LEFT JOIN tickets t ON n.ticket_id = t.id
       WHERE (n.user_id = $1 OR n.user_id IS NULL) AND n.store_id = $2
       ORDER BY n.is_read ASC, n.created_at DESC
       LIMIT 50`,
      [userId, storeId]
    );
  },

  async countUnread(userId, storeId) {
    const row = await db.one(
      `SELECT COUNT(*) as count FROM notifications
       WHERE (user_id = $1 OR user_id IS NULL) AND store_id = $2 AND is_read = 0`,
      [userId, storeId]
    );
    return parseInt(row.count);
  },

  async markRead(id, userId) {
    await db.run('UPDATE notifications SET is_read = 1 WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [id, userId]);
  },

  async markAllRead(userId, storeId) {
    await db.run('UPDATE notifications SET is_read = 1 WHERE (user_id = $1 OR user_id IS NULL) AND store_id = $2', [userId, storeId]);
  },
};
