const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  create({ name, address, phone, email }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO stores (id, name, address, phone, email) VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, address || null, phone || null, email || null);
    return { id, name, address, phone, email };
  },

  findById(id) {
    return db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  },
};
