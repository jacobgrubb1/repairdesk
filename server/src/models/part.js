const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByStore(storeId, { search, category, lowStock, supplierId } = {}) {
    let query = `SELECT p.*, s.name as supplier_name
      FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.store_id = $1`;
    const params = [storeId];
    let idx = 2;
    if (search) {
      query += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx + 1})`;
      const p = `%${search}%`;
      params.push(p, p);
      idx += 2;
    }
    if (category) {
      query += ` AND p.category = $${idx}`;
      params.push(category);
      idx++;
    }
    if (lowStock) {
      query += ' AND p.quantity <= p.min_quantity AND p.min_quantity > 0';
    }
    if (supplierId) {
      query += ` AND p.supplier_id = $${idx}`;
      params.push(supplierId);
      idx++;
    }
    query += ' ORDER BY p.name ASC';
    return db.many(query, params);
  },

  async findById(id, storeId) {
    return db.one(
      `SELECT p.*, s.name as supplier_name
       FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1 AND p.store_id = $2`,
      [id, storeId]
    );
  },

  async create({ storeId, supplierId, name, sku, category, costPrice, sellPrice, quantity, minQuantity }) {
    const id = uuidv4();
    await db.run(
      `INSERT INTO parts (id, store_id, supplier_id, name, sku, category, cost_price, sell_price, quantity, min_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, storeId, supplierId || null, name, sku || null, category || null,
        parseFloat(costPrice) || 0, parseFloat(sellPrice) || 0,
        parseInt(quantity) || 0, parseInt(minQuantity) || 0]
    );
    return this.findById(id, storeId);
  },

  async update(id, storeId, fields) {
    const allowed = ['name', 'sku', 'category', 'cost_price', 'sell_price', 'quantity', 'min_quantity', 'supplier_id'];
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
    params.push(id, storeId);
    await db.run(`UPDATE parts SET ${sets.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1}`, params);
    return this.findById(id, storeId);
  },

  async delete(id, storeId) {
    return db.run('DELETE FROM parts WHERE id = $1 AND store_id = $2', [id, storeId]);
  },

  async adjustStock(id, { quantityChange, type, ticketId, note, createdBy }) {
    const txId = uuidv4();
    const part = await db.one('SELECT * FROM parts WHERE id = $1', [id]);
    if (!part) throw new Error('Part not found');

    await db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO part_transactions (id, part_id, ticket_id, quantity_change, type, note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [txId, id, ticketId || null, quantityChange, type, note || null, createdBy || null]
      );

      const newQty = part.quantity + quantityChange;
      await tx.run("UPDATE parts SET quantity = $1, updated_at = NOW() WHERE id = $2",
        [Math.max(0, newQty), id]);

      if (newQty <= part.min_quantity && part.min_quantity > 0) {
        const notificationModel = require('./notification');
        await notificationModel.notifyRole(part.store_id, 'admin', null, 'low_stock',
          `Low stock alert: "${part.name}" has ${Math.max(0, newQty)} remaining (min: ${part.min_quantity})`);
      }
    });

    return this.findById(id, part.store_id);
  },

  async getLowStockParts(storeId) {
    return db.many(
      `SELECT p.*, s.name as supplier_name
       FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.store_id = $1 AND p.quantity <= p.min_quantity AND p.min_quantity > 0
       ORDER BY (p.quantity * 1.0 / p.min_quantity) ASC`,
      [storeId]
    );
  },

  async searchForCost(storeId, query) {
    return db.many(
      `SELECT id, name, sku, sell_price, cost_price, quantity
       FROM parts WHERE store_id = $1 AND (name ILIKE $2 OR sku ILIKE $3)
       ORDER BY name LIMIT 10`,
      [storeId, `%${query}%`, `%${query}%`]
    );
  },

  async getCategories(storeId) {
    const rows = await db.many(
      "SELECT DISTINCT category FROM parts WHERE store_id = $1 AND category IS NOT NULL ORDER BY category",
      [storeId]
    );
    return rows.map(r => r.category);
  },

  async getTransactions(partId) {
    return db.many(
      `SELECT pt.*, u.name as user_name
       FROM part_transactions pt LEFT JOIN users u ON pt.created_by = u.id
       WHERE pt.part_id = $1 ORDER BY pt.created_at DESC LIMIT 50`,
      [partId]
    );
  },
};
