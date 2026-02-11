const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  findByStore(storeId, { status, search, customerId } = {}) {
    let query = `
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             u1.name as created_by_name, u2.name as assigned_to_name
      FROM tickets t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.store_id = ?`;
    const params = [storeId];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (customerId) {
      query += ' AND t.customer_id = ?';
      params.push(customerId);
    }
    if (search) {
      query += ` AND (c.name LIKE ? OR t.device_brand LIKE ? OR t.device_model LIKE ? OR t.issue_description LIKE ? OR CAST(t.ticket_number AS TEXT) LIKE ?)`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    query += ' ORDER BY t.created_at DESC';
    return db.prepare(query).all(...params);
  },

  findById(id, storeId) {
    return db.prepare(
      `SELECT t.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
              u1.name as created_by_name, u2.name as assigned_to_name,
              s.name as store_name, s.address as store_address, s.phone as store_phone, s.email as store_email
       FROM tickets t
       JOIN customers c ON t.customer_id = c.id
       LEFT JOIN users u1 ON t.created_by = u1.id
       LEFT JOIN users u2 ON t.assigned_to = u2.id
       JOIN stores s ON t.store_id = s.id
       WHERE t.id = ? AND t.store_id = ?`
    ).get(id, storeId);
  },

  create({ storeId, customerId, deviceType, deviceBrand, deviceModel, issueDescription, estimatedCost, createdBy, assignedTo }) {
    const id = uuidv4();
    // Get next ticket number for this store
    const last = db.prepare('SELECT MAX(ticket_number) as max_num FROM tickets WHERE store_id = ?').get(storeId);
    const ticketNumber = (last?.max_num || 0) + 1;

    db.prepare(
      `INSERT INTO tickets (id, store_id, customer_id, ticket_number, device_type, device_brand, device_model,
        issue_description, estimated_cost, created_by, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, storeId, customerId, ticketNumber, deviceType || null, deviceBrand || null, deviceModel || null,
      issueDescription, estimatedCost || null, createdBy, assignedTo || null);

    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  },

  update(id, storeId, fields) {
    const allowed = ['status', 'diagnosis', 'estimated_cost', 'final_cost', 'parts_cost', 'labor_cost', 'assigned_to'];
    const sets = [];
    const params = [];

    for (const [key, value] of Object.entries(fields)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col)) {
        sets.push(`${col} = ?`);
        params.push(value);
      }
    }
    if (!sets.length) return this.findById(id, storeId);

    sets.push(`updated_at = datetime('now')`);
    if (fields.status === 'completed') {
      sets.push(`completed_at = datetime('now')`);
    }

    params.push(id, storeId);
    db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ? AND store_id = ?`).run(...params);
    return this.findById(id, storeId);
  },

  // Notes
  getNotes(ticketId) {
    return db.prepare(
      `SELECT tn.*, u.name as user_name
       FROM ticket_notes tn JOIN users u ON tn.user_id = u.id
       WHERE tn.ticket_id = ? ORDER BY tn.created_at ASC`
    ).all(ticketId);
  },

  addNote(ticketId, userId, content, isInternal = false) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO ticket_notes (id, ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, ?, ?)`
    ).run(id, ticketId, userId, content, isInternal ? 1 : 0);
    return db.prepare('SELECT tn.*, u.name as user_name FROM ticket_notes tn JOIN users u ON tn.user_id = u.id WHERE tn.id = ?').get(id);
  },

  // Costs
  getCosts(ticketId) {
    return db.prepare('SELECT * FROM ticket_costs WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);
  },

  addCost(ticketId, { description, costType, amount }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO ticket_costs (id, ticket_id, description, cost_type, amount) VALUES (?, ?, ?, ?, ?)`
    ).run(id, ticketId, description, costType, amount);

    // Update ticket totals
    const parts = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = ? AND cost_type = 'part'").get(ticketId).total;
    const labor = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = ? AND cost_type = 'labor'").get(ticketId).total;
    const total = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = ?").get(ticketId).total;

    db.prepare(`UPDATE tickets SET parts_cost = ?, labor_cost = ?, final_cost = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(parts, labor, total, ticketId);

    return db.prepare('SELECT * FROM ticket_costs WHERE id = ?').get(id);
  },

  deleteCost(costId, ticketId) {
    db.prepare('DELETE FROM ticket_costs WHERE id = ? AND ticket_id = ?').run(costId, ticketId);

    const parts = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = ? AND cost_type = 'part'").get(ticketId).total;
    const labor = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = ? AND cost_type = 'labor'").get(ticketId).total;
    const total = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = ?").get(ticketId).total;

    db.prepare(`UPDATE tickets SET parts_cost = ?, labor_cost = ?, final_cost = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(parts, labor, total, ticketId);
  },
};
