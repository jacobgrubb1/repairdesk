require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

async function seed() {
  try {
    const storeId = uuidv4();
    db.prepare(
      `INSERT INTO stores (id, name, address, phone, email) VALUES (?, ?, ?, ?, ?)`
    ).run(storeId, 'RepairDesk Demo Shop', '123 Main St, Anytown, USA', '555-0100', 'demo@repairdesk.com');

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('admin123', 10);
    db.prepare(
      `INSERT INTO users (id, store_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, storeId, 'admin@repairdesk.com', passwordHash, 'Admin User', 'admin');

    const custId = uuidv4();
    db.prepare(
      `INSERT INTO customers (id, store_id, name, email, phone) VALUES (?, ?, ?, ?, ?)`
    ).run(custId, storeId, 'John Doe', 'john@example.com', '555-0101');

    const ticketId = uuidv4();
    db.prepare(
      `INSERT INTO tickets (id, store_id, customer_id, ticket_number, device_type, device_brand, device_model, issue_description, status, estimated_cost, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'intake', ?, ?)`
    ).run(ticketId, storeId, custId, 1, 'Phone', 'Apple', 'iPhone 14', 'Cracked screen, touch not working', 149.99, userId);

    console.log('Seed completed successfully');
    console.log('Login: admin@repairdesk.com / admin123');
  } catch (err) {
    console.error('Seed failed:', err.message);
  }
}

seed();
