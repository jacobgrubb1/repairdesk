const db = require('../config/db');

module.exports = {
  async getMetrics() {
    const result = await db.one(`
      SELECT
        (SELECT COUNT(*) FROM stores) AS total_stores,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM tickets) AS total_tickets,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) AS total_revenue
    `);
    return {
      totalStores: Number(result.total_stores),
      totalUsers: Number(result.total_users),
      totalTickets: Number(result.total_tickets),
      totalRevenue: Number(result.total_revenue),
    };
  },

  async getAllStores({ search, page = 1, limit = 25 }) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    let idx = 1;

    if (search) {
      where = `WHERE s.name ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }

    params.push(limit, offset);

    const stores = await db.many(`
      SELECT s.id, s.name, s.is_active, s.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.store_id = s.id) AS user_count,
        (SELECT COUNT(*) FROM tickets t WHERE t.store_id = s.id) AS ticket_count,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.store_id = s.id) AS revenue
      FROM stores s
      ${where}
      ORDER BY s.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const countParams = search ? [`%${search}%`] : [];
    const countResult = await db.one(`
      SELECT COUNT(*) AS total FROM stores s ${where}
    `, countParams);

    return {
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        isActive: s.is_active,
        userCount: Number(s.user_count),
        ticketCount: Number(s.ticket_count),
        revenue: Number(s.revenue),
        createdAt: s.created_at,
      })),
      total: Number(countResult.total),
      page,
      limit,
    };
  },

  async getAllUsers({ search, page = 1, limit = 25 }) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    let idx = 1;

    if (search) {
      where = `WHERE (u.name ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    params.push(limit, offset);

    const users = await db.many(`
      SELECT u.id, u.name, u.email, u.role, u.platform_role, u.is_active,
        s.name AS store_name
      FROM users u
      JOIN stores s ON u.store_id = s.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const countParams = search ? [`%${search}%`] : [];
    const countResult = await db.one(`
      SELECT COUNT(*) AS total FROM users u JOIN stores s ON u.store_id = s.id ${where}
    `, countParams);

    return {
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        platformRole: u.platform_role,
        isActive: u.is_active,
        storeName: u.store_name,
      })),
      total: Number(countResult.total),
      page,
      limit,
    };
  },

  async toggleStoreActive(storeId, isActive) {
    await db.run('UPDATE stores SET is_active = $1 WHERE id = $2', [isActive, storeId]);
    return db.one('SELECT id, name, is_active FROM stores WHERE id = $1', [storeId]);
  },

  async setUserPlatformRole(userId, platformRole) {
    const role = platformRole || null;
    await db.run('UPDATE users SET platform_role = $1 WHERE id = $2', [role, userId]);
    return db.one('SELECT id, name, email, platform_role FROM users WHERE id = $1', [userId]);
  },
};
