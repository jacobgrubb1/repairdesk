const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/reports/monthly?month=1&year=2025
router.get('/monthly', (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const storeId = req.user.storeId;
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status IN ('completed', 'picked_up') THEN 1 ELSE 0 END) as completed_tickets,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN final_cost ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN parts_cost ELSE 0 END), 0) as total_parts_cost,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN labor_cost ELSE 0 END), 0) as total_labor_revenue
      FROM tickets
      WHERE store_id = ? AND strftime('%Y-%m', created_at) = ?
    `).get(storeId, datePrefix);

    const costBreakdown = db.prepare(`
      SELECT tc.cost_type, COALESCE(SUM(tc.amount), 0) as total
      FROM ticket_costs tc
      JOIN tickets t ON tc.ticket_id = t.id
      WHERE t.store_id = ? AND strftime('%Y-%m', tc.created_at) = ?
      GROUP BY tc.cost_type
    `).all(storeId, datePrefix);

    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tickets
      WHERE store_id = ? AND strftime('%Y-%m', created_at) = ?
      GROUP BY status
    `).all(storeId, datePrefix);

    res.json({
      month,
      year,
      ...stats,
      cost_breakdown: costBreakdown,
      status_counts: statusCounts,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
