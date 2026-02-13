const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByEmail(email) {
    return db.one('SELECT * FROM users WHERE email = $1', [email]);
  },

  async findById(id) {
    return db.one(
      'SELECT id, store_id, email, name, role, is_active, org_role, platform_role, created_at FROM users WHERE id = $1',
      [id]
    );
  },

  async create({ storeId, email, passwordHash, name, role, emailVerified, verificationToken }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO users (id, store_id, email, password_hash, name, role, email_verified, verification_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, storeId, email, passwordHash, name, role, emailVerified || 0, verificationToken || null]
    );
    return { id, store_id: storeId, email, name, role, is_active: 1 };
  },

  async update(id, storeId, { name, role, is_active }) {
    const sets = [];
    const params = [];
    let idx = 1;
    if (name !== undefined) { sets.push(`name = $${idx}`); params.push(name); idx++; }
    if (role !== undefined) { sets.push(`role = $${idx}`); params.push(role); idx++; }
    if (is_active !== undefined) { sets.push(`is_active = $${idx}`); params.push(is_active); idx++; }
    if (!sets.length) return this.findById(id);

    params.push(id, storeId);
    await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1}`, params);
    return this.findById(id);
  },

  async findByStore(storeId) {
    return db.many(
      'SELECT id, email, name, role, is_active, org_role, created_at FROM users WHERE store_id = $1 ORDER BY name',
      [storeId]
    );
  },

  async findByOrg(orgId) {
    return db.many(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.org_role, u.store_id, s.name as store_name
       FROM users u JOIN stores s ON u.store_id = s.id
       WHERE s.organization_id = $1 ORDER BY s.name, u.name`,
      [orgId]
    );
  },
};
