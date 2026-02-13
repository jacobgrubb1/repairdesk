const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findTicketByToken(token) {
    return db.one(
      `SELECT t.id, t.ticket_number, t.device_type, t.device_brand, t.device_model,
              t.issue_description, t.status, t.estimated_cost, t.final_cost,
              t.created_at, t.updated_at, t.completed_at,
              c.name as customer_name,
              s.name as store_name, s.phone as store_phone, s.email as store_email,
              s.logo_url as store_logo,
              s.stripe_publishable_key
       FROM tickets t
       JOIN customers c ON t.customer_id = c.id
       JOIN stores s ON t.store_id = s.id
       WHERE t.tracking_token = $1`,
      [token]
    );
  },

  async getCostsByToken(token) {
    return db.many(
      `SELECT tc.description, tc.cost_type, tc.amount
       FROM ticket_costs tc
       JOIN tickets t ON tc.ticket_id = t.id
       WHERE t.tracking_token = $1
       ORDER BY tc.created_at ASC`,
      [token]
    );
  },

  async getPhotosByToken(token) {
    return db.many(
      `SELECT tp.id, tp.url, tp.caption, tp.photo_type, tp.created_at
       FROM ticket_photos tp
       JOIN tickets t ON tp.ticket_id = t.id
       WHERE t.tracking_token = $1
       ORDER BY tp.created_at ASC`,
      [token]
    );
  },

  async getFeedbackByToken(token) {
    return db.one(
      `SELECT f.rating, f.comment, f.created_at
       FROM ticket_feedback f
       JOIN tickets t ON f.ticket_id = t.id
       WHERE t.tracking_token = $1`,
      [token]
    );
  },

  async approve(token) {
    const ticket = await db.one('SELECT id, store_id, status, ticket_number FROM tickets WHERE tracking_token = $1', [token]);
    if (!ticket) return null;
    if (ticket.status !== 'awaiting_approval') return { error: 'Ticket is not awaiting approval' };

    await db.transaction(async (tx) => {
      await tx.run("UPDATE tickets SET status = 'in_repair', updated_at = NOW() WHERE id = $1", [ticket.id]);
      const approvalId = uuidv4();
      await tx.run(
        `INSERT INTO ticket_approvals (id, ticket_id, action) VALUES ($1, $2, 'approved')`,
        [approvalId, ticket.id]
      );
    });

    const notificationModel = require('./notification');
    await notificationModel.notifyRole(ticket.store_id, 'admin', ticket.id, 'customer_approved',
      `Customer approved Ticket #${ticket.ticket_number}`);

    return { success: true };
  },

  async reject(token, reason) {
    const ticket = await db.one('SELECT id, store_id, status, ticket_number FROM tickets WHERE tracking_token = $1', [token]);
    if (!ticket) return null;
    if (ticket.status !== 'awaiting_approval') return { error: 'Ticket is not awaiting approval' };

    await db.transaction(async (tx) => {
      await tx.run("UPDATE tickets SET status = 'diagnosing', updated_at = NOW() WHERE id = $1", [ticket.id]);
      const approvalId = uuidv4();
      await tx.run(
        `INSERT INTO ticket_approvals (id, ticket_id, action, reason) VALUES ($1, $2, 'rejected', $3)`,
        [approvalId, ticket.id, reason || null]
      );
    });

    const notificationModel = require('./notification');
    await notificationModel.notifyRole(ticket.store_id, 'admin', ticket.id, 'customer_rejected',
      `Customer rejected Ticket #${ticket.ticket_number}${reason ? ': ' + reason : ''}`);

    return { success: true };
  },

  async getPaymentsByToken(token) {
    const ticket = await db.one('SELECT id FROM tickets WHERE tracking_token = $1', [token]);
    if (!ticket) return null;
    const payments = await db.many(
      `SELECT p.id, p.amount, p.method, p.note, p.created_at, p.stripe_session_id
       FROM payments p
       WHERE p.ticket_id = $1
       ORDER BY p.created_at ASC`,
      [ticket.id]
    );
    const totalRow = await db.one(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE ticket_id = $1',
      [ticket.id]
    );
    return { payments, totalPaid: parseFloat(totalRow.total) };
  },

  async getTicketFullByToken(token) {
    return db.one(
      `SELECT t.id, t.ticket_number, t.store_id, t.estimated_cost, t.final_cost,
              c.name as customer_name,
              s.stripe_publishable_key
       FROM tickets t
       JOIN customers c ON t.customer_id = c.id
       JOIN stores s ON t.store_id = s.id
       WHERE t.tracking_token = $1`,
      [token]
    );
  },

  async submitFeedback(token, { rating, comment }) {
    const ticket = await db.one('SELECT id, store_id, status, ticket_number FROM tickets WHERE tracking_token = $1', [token]);
    if (!ticket) return null;
    if (!['completed', 'picked_up'].includes(ticket.status)) {
      return { error: 'Feedback can only be submitted for completed repairs' };
    }

    const existing = await db.one('SELECT id FROM ticket_feedback WHERE ticket_id = $1', [ticket.id]);
    if (existing) return { error: 'Feedback already submitted' };

    const id = uuidv4();
    await db.run(
      `INSERT INTO ticket_feedback (id, ticket_id, store_id, rating, comment) VALUES ($1, $2, $3, $4, $5)`,
      [id, ticket.id, ticket.store_id, rating, comment || null]
    );

    const notificationModel = require('./notification');
    await notificationModel.notifyRole(ticket.store_id, 'admin', ticket.id, 'customer_feedback',
      `Customer left ${rating}-star review for Ticket #${ticket.ticket_number}`);

    return { success: true };
  },
};
