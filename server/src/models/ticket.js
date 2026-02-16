const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByStore(storeId, { status, search, customerId, assignedTo } = {}) {
    let query = `
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             u1.name as created_by_name, u2.name as assigned_to_name,
             COALESCE(pay.total_paid, 0) as total_paid
      FROM tickets t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      LEFT JOIN (SELECT ticket_id, SUM(amount) as total_paid FROM payments GROUP BY ticket_id) pay ON pay.ticket_id = t.id
      WHERE t.store_id = $1`;
    const params = [storeId];
    let idx = 2;

    if (status) {
      query += ` AND t.status = $${idx}`;
      params.push(status);
      idx++;
    }
    if (customerId) {
      query += ` AND t.customer_id = $${idx}`;
      params.push(customerId);
      idx++;
    }
    if (assignedTo === 'unassigned') {
      query += ' AND t.assigned_to IS NULL';
    } else if (assignedTo) {
      query += ` AND t.assigned_to = $${idx}`;
      params.push(assignedTo);
      idx++;
    }
    if (search) {
      query += ` AND (c.name ILIKE $${idx} OR t.device_brand ILIKE $${idx + 1} OR t.device_model ILIKE $${idx + 2} OR t.issue_description ILIKE $${idx + 3} OR CAST(t.ticket_number AS TEXT) ILIKE $${idx + 4})`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
      idx += 5;
    }

    query += ' ORDER BY t.created_at DESC';
    return db.many(query, params);
  },

  async findById(id, storeId) {
    return db.one(
      `SELECT t.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
              u1.name as created_by_name, u2.name as assigned_to_name,
              s.name as store_name, s.address as store_address, s.phone as store_phone, s.email as store_email
       FROM tickets t
       JOIN customers c ON t.customer_id = c.id
       LEFT JOIN users u1 ON t.created_by = u1.id
       LEFT JOIN users u2 ON t.assigned_to = u2.id
       JOIN stores s ON t.store_id = s.id
       WHERE t.id = $1 AND t.store_id = $2`,
      [id, storeId]
    );
  },

  async create({ storeId, customerId, deviceType, deviceBrand, deviceModel, issueDescription, estimatedCost, createdBy, assignedTo, notifyCustomer, accessories }) {
    const id = uuidv4();
    const trackingToken = uuidv4();
    const last = await db.one('SELECT MAX(ticket_number) as max_num FROM tickets WHERE store_id = $1', [storeId]);
    const ticketNumber = (last?.max_num || 0) + 1;

    await db.run(
      `INSERT INTO tickets (id, store_id, customer_id, ticket_number, device_type, device_brand, device_model,
        issue_description, estimated_cost, created_by, assigned_to, notify_customer, accessories, tracking_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, storeId, customerId, ticketNumber, deviceType || null, deviceBrand || null, deviceModel || null,
        issueDescription, estimatedCost || null, createdBy, assignedTo || null, notifyCustomer ? 1 : 0, accessories || null, trackingToken]
    );

    return db.one('SELECT * FROM tickets WHERE id = $1', [id]);
  },

  async update(id, storeId, fields) {
    const allowed = ['status', 'diagnosis', 'estimated_cost', 'final_cost', 'parts_cost', 'labor_cost', 'assigned_to', 'notify_customer', 'intake_signature', 'pickup_signature', 'accessories'];
    const sets = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col)) {
        sets.push(`${col} = $${idx}`);
        params.push(value);
        idx++;
      }
    }
    if (!sets.length) return this.findById(id, storeId);

    sets.push(`updated_at = NOW()`);
    if (fields.status === 'completed') {
      sets.push(`completed_at = NOW()`);
    }

    // Get ticket before update for change detection
    const before = await db.one('SELECT status, assigned_to, ticket_number, notify_customer, store_id, customer_id FROM tickets WHERE id = $1', [id]);

    params.push(id, storeId);
    await db.run(`UPDATE tickets SET ${sets.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1}`, params);

    // Fire notifications on status change
    if (fields.status && before && fields.status !== before.status) {
      const notificationModel = require('./notification');
      const label = fields.status.replace(/_/g, ' ');

      if (before.assigned_to) {
        await notificationModel.create({
          storeId, userId: before.assigned_to, ticketId: id,
          type: 'status_change',
          message: `Ticket #${before.ticket_number} moved to ${label}`,
        });
      }

      if (fields.status === 'awaiting_approval') {
        await notificationModel.notifyRole(storeId, 'admin', id, 'approval_needed',
          `Ticket #${before.ticket_number} needs approval`);
      }

      // Email notification to customer
      if (before.notify_customer) {
        try {
          const customer = await db.one('SELECT name, email FROM customers WHERE id = $1', [before.customer_id]);
          if (customer?.email) {
            const store = await db.one('SELECT name FROM stores WHERE id = $1', [storeId]);
            const ticket = await db.one('SELECT tracking_token FROM tickets WHERE id = $1', [id]);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const trackingUrl = `${frontendUrl}/track/${ticket.tracking_token}`;
            const { sendEmail } = require('../utils/email');
            const templates = require('../utils/emailTemplates');

            if (fields.status === 'awaiting_approval') {
              const emailData = templates.approvalNeededEmail({ customerName: customer.name, ticketNumber: before.ticket_number, storeName: store.name, trackingUrl });
              sendEmail({ to: customer.email, ...emailData });
            } else {
              const emailData = templates.statusChangeEmail({ customerName: customer.name, ticketNumber: before.ticket_number, storeName: store.name, status: fields.status, trackingUrl });
              sendEmail({ to: customer.email, ...emailData });
            }
          }
        } catch (err) {
          console.error('Email notification failed:', err.message);
        }
      }
    }

    // Fire notification on assignment change
    if (fields.assignedTo && fields.assignedTo !== before?.assigned_to) {
      const notificationModel = require('./notification');
      await notificationModel.create({
        storeId, userId: fields.assignedTo, ticketId: id,
        type: 'assignment',
        message: `Ticket #${before.ticket_number} assigned to you`,
      });
    }

    return this.findById(id, storeId);
  },

  // Notes
  async getNotes(ticketId) {
    return db.many(
      `SELECT tn.*, u.name as user_name
       FROM ticket_notes tn JOIN users u ON tn.user_id = u.id
       WHERE tn.ticket_id = $1 ORDER BY tn.created_at ASC`,
      [ticketId]
    );
  },

  async addNote(ticketId, userId, content, isInternal = false) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO ticket_notes (id, ticket_id, user_id, content, is_internal) VALUES ($1, $2, $3, $4, $5)`,
      [id, ticketId, userId, content, isInternal ? 1 : 0]
    );
    return db.one('SELECT tn.*, u.name as user_name FROM ticket_notes tn JOIN users u ON tn.user_id = u.id WHERE tn.id = $1', [id]);
  },

  // Costs
  async getCosts(ticketId) {
    return db.many('SELECT * FROM ticket_costs WHERE ticket_id = $1 ORDER BY created_at ASC', [ticketId]);
  },

  async addCost(ticketId, { description, costType, amount, hours, hourlyRate, partId, quantity }) {
    const id = uuidv4();
    const qty = partId ? Math.max(1, parseInt(quantity) || 1) : 1;
    const finalAmount = costType === 'labor' && hours && hourlyRate
      ? parseFloat(hours) * parseFloat(hourlyRate)
      : parseFloat(amount);

    // Validate stock before deducting
    if (partId) {
      const partModel = require('./part');
      const part = await db.one('SELECT quantity FROM parts WHERE id = $1', [partId]);
      if (part && part.quantity < qty) {
        throw Object.assign(new Error(`Insufficient stock: only ${part.quantity} available, need ${qty}`), { status: 400 });
      }
    }

    await db.run(
      `INSERT INTO ticket_costs (id, ticket_id, description, cost_type, amount, hours, hourly_rate, part_id, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, ticketId, description, costType, finalAmount, hours || null, hourlyRate || null, partId || null, qty]
    );

    // Auto-deduct inventory when linking a part
    if (partId) {
      const partModel = require('./part');
      await partModel.adjustStock(partId, {
        quantityChange: -qty,
        type: 'used',
        ticketId,
        note: `Used ${qty} on ticket`,
        createdBy: null,
      });
    }

    // Update ticket totals
    const parts = await db.one("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = $1 AND cost_type = 'part'", [ticketId]);
    const labor = await db.one("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = $1 AND cost_type = 'labor'", [ticketId]);
    const total = await db.one("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = $1", [ticketId]);

    await db.run(`UPDATE tickets SET parts_cost = $1, labor_cost = $2, final_cost = $3, updated_at = NOW() WHERE id = $4`,
      [parts.total, labor.total, total.total, ticketId]);

    return db.one('SELECT * FROM ticket_costs WHERE id = $1', [id]);
  },

  async deleteCost(costId, ticketId) {
    // Restore inventory if cost was linked to a part
    const cost = await db.one('SELECT part_id, quantity FROM ticket_costs WHERE id = $1', [costId]);
    if (cost && cost.part_id) {
      const qty = cost.quantity || 1;
      const partModel = require('./part');
      await partModel.adjustStock(cost.part_id, {
        quantityChange: qty,
        type: 'adjustment',
        ticketId,
        note: `Restored ${qty} - cost removed from ticket`,
        createdBy: null,
      });
    }
    await db.run('DELETE FROM ticket_costs WHERE id = $1 AND ticket_id = $2', [costId, ticketId]);

    const parts = await db.one("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = $1 AND cost_type = 'part'", [ticketId]);
    const labor = await db.one("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = $1 AND cost_type = 'labor'", [ticketId]);
    const total = await db.one("SELECT COALESCE(SUM(amount), 0) as total FROM ticket_costs WHERE ticket_id = $1", [ticketId]);

    await db.run(`UPDATE tickets SET parts_cost = $1, labor_cost = $2, final_cost = $3, updated_at = NOW() WHERE id = $4`,
      [parts.total, labor.total, total.total, ticketId]);
  },

  async findSimilar(storeId, ticket) {
    const conditions = [];
    const params = [storeId, ticket.id];
    let idx = 3;

    if (ticket.device_brand) {
      conditions.push(`t.device_brand ILIKE $${idx}`);
      params.push(ticket.device_brand);
      idx++;
    }
    if (ticket.device_model) {
      conditions.push(`t.device_model ILIKE $${idx}`);
      params.push(ticket.device_model);
      idx++;
    }

    if (conditions.length === 0) return [];

    const query = `
      SELECT t.id, t.ticket_number, t.device_brand, t.device_model, t.issue_description,
             t.diagnosis, t.status, t.final_cost, t.created_at, c.name as customer_name
      FROM tickets t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.store_id = $1 AND t.id != $2 AND t.status IN ('completed', 'picked_up')
        AND (${conditions.join(' OR ')})
      ORDER BY t.created_at DESC
      LIMIT 5`;

    return db.many(query, params);
  },
};
