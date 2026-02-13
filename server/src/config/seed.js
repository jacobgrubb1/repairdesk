require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

async function seed() {
  try {
    const storeId = uuidv4();
    await db.run(
      `INSERT INTO stores (id, name, address, phone, email) VALUES ($1, $2, $3, $4, $5)`,
      [storeId, 'RepairDesk Demo Shop', '123 Main St, Anytown, USA', '555-0100', 'demo@repairdesk.com']
    );

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db.run(
      `INSERT INTO users (id, store_id, email, password_hash, name, role, email_verified, platform_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, storeId, 'admin@repairdesk.com', passwordHash, 'Admin User', 'admin', 1, 'platform_admin']
    );

    const custId = uuidv4();
    await db.run(
      `INSERT INTO customers (id, store_id, name, email, phone) VALUES ($1, $2, $3, $4, $5)`,
      [custId, storeId, 'John Doe', 'john@example.com', '555-0101']
    );

    const ticketId = uuidv4();
    const trackingToken = uuidv4();
    await db.run(
      `INSERT INTO tickets (id, store_id, customer_id, ticket_number, device_type, device_brand, device_model, issue_description, status, estimated_cost, created_by, tracking_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'intake', $9, $10, $11)`,
      [ticketId, storeId, custId, 1, 'Phone', 'Apple', 'iPhone 14', 'Cracked screen, touch not working', 149.99, userId, trackingToken]
    );

    console.log('Seed completed successfully');
    console.log('Login: admin@repairdesk.com / admin123');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await db.pool.end();
  }
}

seed();
