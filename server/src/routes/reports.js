const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/reports/monthly?month=1&year=2025
router.get('/monthly', async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const storeId = req.user.storeId;
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const stats = await db.one(`
      SELECT
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status IN ('completed', 'picked_up') THEN 1 ELSE 0 END) as completed_tickets,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN final_cost ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN parts_cost ELSE 0 END), 0) as total_parts_cost,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN labor_cost ELSE 0 END), 0) as total_labor_revenue
      FROM tickets
      WHERE store_id = $1 AND to_char(created_at, 'YYYY-MM') = $2
    `, [storeId, datePrefix]);

    const costBreakdown = await db.many(`
      SELECT tc.cost_type, COALESCE(SUM(tc.amount), 0) as total
      FROM ticket_costs tc
      JOIN tickets t ON tc.ticket_id = t.id
      WHERE t.store_id = $1 AND to_char(tc.created_at, 'YYYY-MM') = $2
      GROUP BY tc.cost_type
    `, [storeId, datePrefix]);

    const statusCounts = await db.many(`
      SELECT status, COUNT(*) as count
      FROM tickets
      WHERE store_id = $1 AND to_char(created_at, 'YYYY-MM') = $2
      GROUP BY status
    `, [storeId, datePrefix]);

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

// GET /api/reports/tech-performance
router.get('/tech-performance', async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const stats = await db.many(`
      SELECT u.id, u.name,
        COUNT(t.id) as total_tickets,
        SUM(CASE WHEN t.status IN ('completed', 'picked_up') THEN 1 ELSE 0 END) as completed_tickets,
        COALESCE(SUM(CASE WHEN t.status IN ('completed', 'picked_up') THEN t.final_cost ELSE 0 END), 0) as revenue,
        AVG(CASE WHEN t.completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600
          ELSE NULL END) as avg_completion_hours
      FROM users u
      LEFT JOIN tickets t ON t.assigned_to = u.id AND to_char(t.created_at, 'YYYY-MM') = $1
      WHERE u.store_id = $2 AND u.role = 'technician' AND u.is_active = 1
      GROUP BY u.id, u.name
      ORDER BY completed_tickets DESC
    `, [datePrefix, req.user.storeId]);

    res.json({ month, year, technicians: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/revenue-trend
router.get('/revenue-trend', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const rows = await db.many(`
      SELECT to_char(created_at, 'YYYY-MM') as month,
        COUNT(*) as tickets,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN final_cost ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN parts_cost ELSE 0 END), 0) as parts_cost,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'picked_up') THEN labor_cost ELSE 0 END), 0) as labor_cost
      FROM tickets
      WHERE store_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `, [storeId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/top-customers
router.get('/top-customers', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const rows = await db.many(`
      SELECT c.id, c.name, c.phone, c.email,
        COUNT(t.id) as ticket_count,
        COALESCE(SUM(t.final_cost), 0) as total_spent
      FROM customers c
      JOIN tickets t ON t.customer_id = c.id
      WHERE t.store_id = $1 AND to_char(t.created_at, 'YYYY-MM') = $2
        AND t.status IN ('completed', 'picked_up')
      GROUP BY c.id, c.name, c.phone, c.email
      ORDER BY total_spent DESC
      LIMIT 20
    `, [storeId, datePrefix]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/device-types
router.get('/device-types', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const rows = await db.many(`
      SELECT COALESCE(device_type, 'Unknown') as device_type,
        COALESCE(device_brand, 'Unknown') as device_brand,
        COUNT(*) as ticket_count,
        COALESCE(SUM(final_cost), 0) as revenue,
        AVG(CASE WHEN completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          ELSE NULL END) as avg_hours
      FROM tickets
      WHERE store_id = $1 AND to_char(created_at, 'YYYY-MM') = $2
      GROUP BY device_type, device_brand
      ORDER BY revenue DESC
    `, [storeId, datePrefix]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/turnaround
router.get('/turnaround', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const rows = await db.many(`
      SELECT to_char(created_at, 'YYYY-MM') as month,
        AVG(CASE WHEN completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          ELSE NULL END) as avg_hours,
        MIN(CASE WHEN completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          ELSE NULL END) as min_hours,
        MAX(CASE WHEN completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          ELSE NULL END) as max_hours,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
      FROM tickets
      WHERE store_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `, [storeId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/payments
router.get('/payments', async (req, res, next) => {
  try {
    const paymentModel = require('../models/payment');
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await paymentModel.getStorePayments(req.user.storeId, month, year);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/inventory
router.get('/inventory', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const parts = await db.many(`
      SELECT p.name, p.sku, p.cost_price, p.sell_price, p.quantity,
        COUNT(pt.id) as times_used,
        COALESCE(SUM(CASE WHEN pt.type = 'used' THEN ABS(pt.quantity_change) ELSE 0 END), 0) as qty_sold,
        (p.sell_price - p.cost_price) as margin_per_unit
      FROM parts p
      LEFT JOIN part_transactions pt ON pt.part_id = p.id AND pt.type = 'used'
        AND to_char(pt.created_at, 'YYYY-MM') = $1
      WHERE p.store_id = $2
      GROUP BY p.id, p.name, p.sku, p.cost_price, p.sell_price, p.quantity
      ORDER BY qty_sold DESC
    `, [datePrefix, storeId]);

    const feedbackModel = require('../models/feedback');
    const feedback = await feedbackModel.getStoreAverage(storeId);

    res.json({ month, year, parts, feedback });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
