const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByStore(storeId) {
    return db.many('SELECT * FROM canned_responses WHERE store_id = $1 ORDER BY title', [storeId]);
  },

  async create({ storeId, title, content, category }) {
    const id = uuidv4();
    await db.run(
      'INSERT INTO canned_responses (id, store_id, title, content, category) VALUES ($1, $2, $3, $4, $5)',
      [id, storeId, title, content, category || null]
    );
    return db.one('SELECT * FROM canned_responses WHERE id = $1', [id]);
  },

  async update(id, storeId, { title, content, category }) {
    const sets = [];
    const params = [];
    let idx = 1;
    if (title !== undefined) { sets.push(`title = $${idx}`); params.push(title); idx++; }
    if (content !== undefined) { sets.push(`content = $${idx}`); params.push(content); idx++; }
    if (category !== undefined) { sets.push(`category = $${idx}`); params.push(category); idx++; }
    if (!sets.length) return;
    params.push(id, storeId);
    await db.run(`UPDATE canned_responses SET ${sets.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1}`, params);
    return db.one('SELECT * FROM canned_responses WHERE id = $1', [id]);
  },

  async delete(id, storeId) {
    await db.run('DELETE FROM canned_responses WHERE id = $1 AND store_id = $2', [id, storeId]);
  },
};
