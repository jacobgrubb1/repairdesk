const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async create({ name }) {
    const id = uuidv4();
    await db.run('INSERT INTO organizations (id, name) VALUES ($1, $2)', [id, name]);
    return { id, name };
  },

  async findById(id) {
    return db.one('SELECT * FROM organizations WHERE id = $1', [id]);
  },

  async getStores(orgId) {
    return db.many(
      `SELECT s.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.store_id = s.id) as total_tickets,
        (SELECT COUNT(*) FROM tickets t WHERE t.store_id = s.id AND t.status NOT IN ('completed', 'picked_up', 'cancelled')) as active_tickets,
        (SELECT COALESCE(SUM(final_cost), 0) FROM tickets t WHERE t.store_id = s.id AND t.status IN ('completed', 'picked_up')) as total_revenue
       FROM stores s WHERE s.organization_id = $1 ORDER BY s.name`,
      [orgId]
    );
  },

  async getDashboard(orgId) {
    const stores = await this.getStores(orgId);
    const storeIds = stores.map(s => s.id);
    if (!storeIds.length) return { stores, totals: { tickets: 0, revenue: 0, activeTickets: 0 } };

    const placeholders = storeIds.map((_, i) => `$${i + 1}`).join(',');
    const totals = await db.one(`
      SELECT
        COUNT(*) as tickets,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN final_cost ELSE 0 END), 0) as revenue,
        SUM(CASE WHEN status NOT IN ('completed', 'picked_up', 'cancelled') THEN 1 ELSE 0 END) as active_tickets
      FROM tickets WHERE store_id IN (${placeholders})
    `, storeIds);

    return { stores, totals };
  },

  async addStore(orgId, storeId) {
    await db.run('UPDATE stores SET organization_id = $1 WHERE id = $2', [orgId, storeId]);
  },

  async createStore(orgId, { name, address, phone, email }) {
    const storeModel = require('./store');
    const store = await storeModel.create({ name, address, phone, email });
    await this.addStore(orgId, store.id);
    return { ...store, organization_id: orgId };
  },

  async transferTicket(ticketId, fromStoreId, toStoreId, userId, reason) {
    const id = uuidv4();

    await db.transaction(async (tx) => {
      await tx.run('UPDATE tickets SET store_id = $1 WHERE id = $2 AND store_id = $3',
        [toStoreId, ticketId, fromStoreId]);
      await tx.run(
        `INSERT INTO ticket_transfers (id, ticket_id, from_store_id, to_store_id, transferred_by, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, ticketId, fromStoreId, toStoreId, userId, reason || null]
      );
    });

    const ticket = await db.one('SELECT ticket_number FROM tickets WHERE id = $1', [ticketId]);
    const toStore = await db.one('SELECT name FROM stores WHERE id = $1', [toStoreId]);
    const notificationModel = require('./notification');
    await notificationModel.notifyRole(toStoreId, 'admin', ticketId, 'ticket_transfer',
      `Ticket #${ticket.ticket_number} transferred to ${toStore.name}`);

    return { success: true };
  },

  async getInventory(orgId) {
    return db.many(
      `SELECT p.*, s.name as store_name, sup.name as supplier_name
       FROM parts p
       JOIN stores s ON p.store_id = s.id
       LEFT JOIN suppliers sup ON p.supplier_id = sup.id
       WHERE s.organization_id = $1
       ORDER BY p.name`,
      [orgId]
    );
  },
};
