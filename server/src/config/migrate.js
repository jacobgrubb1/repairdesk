require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');
const db = require('./db');

try {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/001_initial.sql'),
    'utf8'
  );
  db.exec(sql);
  console.log('Migration completed successfully');
} catch (err) {
  console.error('Migration failed:', err.message);
}
