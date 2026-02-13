const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async findByStore(storeId) {
    const templates = await db.many('SELECT * FROM repair_templates WHERE store_id = $1 ORDER BY name', [storeId]);
    for (const t of templates) {
      t.items = await db.many('SELECT * FROM repair_template_items WHERE template_id = $1 ORDER BY cost_type, description', [t.id]);
    }
    return templates;
  },

  async findById(id, storeId) {
    const template = await db.one('SELECT * FROM repair_templates WHERE id = $1 AND store_id = $2', [id, storeId]);
    if (template) {
      template.items = await db.many('SELECT * FROM repair_template_items WHERE template_id = $1', [id]);
    }
    return template;
  },

  async create({ storeId, name, deviceType, deviceBrand, items }) {
    const id = uuidv4();
    await db.run('INSERT INTO repair_templates (id, store_id, name, device_type, device_brand) VALUES ($1, $2, $3, $4, $5)',
      [id, storeId, name, deviceType || null, deviceBrand || null]);

    if (items?.length) {
      for (const item of items) {
        await db.run(
          'INSERT INTO repair_template_items (id, template_id, description, cost_type, amount, hours, hourly_rate) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [uuidv4(), id, item.description, item.costType, item.amount, item.hours || null, item.hourlyRate || null]
        );
      }
    }
    return this.findById(id, storeId);
  },

  async update(id, storeId, { name, deviceType, deviceBrand, items }) {
    await db.run('UPDATE repair_templates SET name = $1, device_type = $2, device_brand = $3 WHERE id = $4 AND store_id = $5',
      [name, deviceType || null, deviceBrand || null, id, storeId]);

    if (items) {
      await db.run('DELETE FROM repair_template_items WHERE template_id = $1', [id]);
      for (const item of items) {
        await db.run(
          'INSERT INTO repair_template_items (id, template_id, description, cost_type, amount, hours, hourly_rate) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [uuidv4(), id, item.description, item.costType, item.amount, item.hours || null, item.hourlyRate || null]
        );
      }
    }
    return this.findById(id, storeId);
  },

  async delete(id, storeId) {
    await db.run('DELETE FROM repair_templates WHERE id = $1 AND store_id = $2', [id, storeId]);
  },

  async applyToTicket(templateId, ticketId, storeId) {
    const template = await this.findById(templateId, storeId);
    if (!template) return null;

    const ticketModel = require('./ticket');
    const results = [];
    for (const item of template.items) {
      const cost = await ticketModel.addCost(ticketId, {
        description: item.description,
        costType: item.cost_type,
        amount: item.amount,
        hours: item.hours,
        hourlyRate: item.hourly_rate,
      });
      results.push(cost);
    }
    return results;
  },
};
