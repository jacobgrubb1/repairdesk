const db = require('../config/db');

module.exports = {
  async getSuggestions(storeId, { deviceType, keywords } = {}) {
    let query = `
      SELECT diagnosis,
        COUNT(*) as match_count,
        AVG(final_cost) as avg_cost,
        AVG(CASE WHEN completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          ELSE NULL END) as avg_hours
      FROM tickets
      WHERE store_id = $1 AND status IN ('completed', 'picked_up')
        AND diagnosis IS NOT NULL AND diagnosis != ''`;
    const params = [storeId];
    let idx = 2;

    if (deviceType) {
      query += ` AND device_type = $${idx}`;
      params.push(deviceType);
      idx++;
    }
    if (keywords) {
      const words = keywords.split(/\s+/).filter(w => w.length > 2);
      for (const word of words) {
        query += ` AND (issue_description ILIKE $${idx} OR diagnosis ILIKE $${idx + 1})`;
        params.push(`%${word}%`, `%${word}%`);
        idx += 2;
      }
    }

    query += ' GROUP BY diagnosis ORDER BY match_count DESC LIMIT 5';
    return db.many(query, params);
  },

  async getPriceEstimate(storeId, { deviceType, keywords } = {}) {
    let query = `
      SELECT
        AVG(final_cost) as avg_cost,
        MIN(final_cost) as min_cost,
        MAX(final_cost) as max_cost,
        COUNT(*) as sample_size
      FROM tickets
      WHERE store_id = $1 AND status IN ('completed', 'picked_up') AND final_cost > 0`;
    const params = [storeId];
    let idx = 2;

    if (deviceType) {
      query += ` AND device_type = $${idx}`;
      params.push(deviceType);
      idx++;
    }
    if (keywords) {
      const words = keywords.split(/\s+/).filter(w => w.length > 2);
      for (const word of words) {
        query += ` AND (issue_description ILIKE $${idx} OR diagnosis ILIKE $${idx + 1})`;
        params.push(`%${word}%`, `%${word}%`);
        idx += 2;
      }
    }

    return db.one(query, params);
  },

  async getTimeEstimate(storeId, { deviceType, keywords } = {}) {
    let query = `
      SELECT
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as avg_hours,
        MIN(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as min_hours,
        MAX(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as max_hours,
        COUNT(*) as sample_size
      FROM tickets
      WHERE store_id = $1 AND status IN ('completed', 'picked_up') AND completed_at IS NOT NULL`;
    const params = [storeId];
    let idx = 2;

    if (deviceType) {
      query += ` AND device_type = $${idx}`;
      params.push(deviceType);
      idx++;
    }
    if (keywords) {
      const words = keywords.split(/\s+/).filter(w => w.length > 2);
      for (const word of words) {
        query += ` AND (issue_description ILIKE $${idx} OR diagnosis ILIKE $${idx + 1})`;
        params.push(`%${word}%`, `%${word}%`);
        idx += 2;
      }
    }

    return db.one(query, params);
  },

  async getKnowledgeBase(storeId, { deviceType, search, page = 1, limit = 20 } = {}) {
    let query = `
      SELECT t.ticket_number, t.device_type, t.device_brand, t.device_model,
             t.issue_description, t.diagnosis, t.final_cost, t.parts_cost, t.labor_cost,
             t.created_at, t.completed_at,
             c.name as customer_name
      FROM tickets t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.store_id = $1 AND t.status IN ('completed', 'picked_up')`;
    let countQuery = `SELECT COUNT(*) as total FROM tickets t WHERE t.store_id = $1 AND t.status IN ('completed', 'picked_up')`;
    const params = [storeId];
    const countParams = [storeId];
    let idx = 2;
    let countIdx = 2;

    if (deviceType) {
      query += ` AND t.device_type = $${idx}`;
      countQuery += ` AND t.device_type = $${countIdx}`;
      params.push(deviceType);
      countParams.push(deviceType);
      idx++;
      countIdx++;
    }
    if (search) {
      const p = `%${search}%`;
      query += ` AND (t.issue_description ILIKE $${idx} OR t.diagnosis ILIKE $${idx + 1} OR t.device_brand ILIKE $${idx + 2} OR t.device_model ILIKE $${idx + 3})`;
      countQuery += ` AND (t.issue_description ILIKE $${countIdx} OR t.diagnosis ILIKE $${countIdx + 1} OR t.device_brand ILIKE $${countIdx + 2} OR t.device_model ILIKE $${countIdx + 3})`;
      params.push(p, p, p, p);
      countParams.push(p, p, p, p);
      idx += 4;
      countIdx += 4;
    }

    const totalRow = await db.one(countQuery, countParams);
    const total = parseInt(totalRow.total);
    const offset = (page - 1) * limit;
    query += ` ORDER BY t.completed_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    return { items: await db.many(query, params), total, page, limit };
  },
};
