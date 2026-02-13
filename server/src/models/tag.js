const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByStore(storeId) {
    return db.many('SELECT * FROM tags WHERE store_id = $1 ORDER BY name', [storeId]);
  },

  async create({ storeId, name, color }) {
    const id = uuidv4();
    await db.run('INSERT INTO tags (id, store_id, name, color) VALUES ($1, $2, $3, $4)', [id, storeId, name, color || '#3b82f6']);
    return { id, store_id: storeId, name, color: color || '#3b82f6' };
  },

  async update(id, storeId, { name, color }) {
    const sets = [];
    const params = [];
    let idx = 1;
    if (name !== undefined) { sets.push(`name = $${idx}`); params.push(name); idx++; }
    if (color !== undefined) { sets.push(`color = $${idx}`); params.push(color); idx++; }
    if (!sets.length) return;
    params.push(id, storeId);
    await db.run(`UPDATE tags SET ${sets.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1}`, params);
    return db.one('SELECT * FROM tags WHERE id = $1', [id]);
  },

  async delete(id, storeId) {
    await db.run('DELETE FROM tags WHERE id = $1 AND store_id = $2', [id, storeId]);
  },

  async getTicketTags(ticketId) {
    return db.many(
      `SELECT t.* FROM tags t
       JOIN ticket_tags tt ON t.id = tt.tag_id
       WHERE tt.ticket_id = $1
       ORDER BY t.name`,
      [ticketId]
    );
  },

  async addToTicket(ticketId, tagId) {
    try {
      await db.run('INSERT INTO ticket_tags (ticket_id, tag_id) VALUES ($1, $2)', [ticketId, tagId]);
    } catch (e) {
      // Already exists — ignore duplicate
    }
  },

  async removeFromTicket(ticketId, tagId) {
    await db.run('DELETE FROM ticket_tags WHERE ticket_id = $1 AND tag_id = $2', [ticketId, tagId]);
  },
};
