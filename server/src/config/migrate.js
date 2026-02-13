require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrate() {
  try {
    // Create migrations tracking table
    await db.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const applied = await db.one('SELECT id FROM _migrations WHERE name = $1', [file]);
      if (applied) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // Split into individual statements
      const statements = [];
      let current = '';
      let depth = 0;

      for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        // Skip single-line comments
        if (char === '-' && sql[i + 1] === '-') {
          const nl = sql.indexOf('\n', i);
          i = nl === -1 ? sql.length : nl;
          continue;
        }
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (char === ';' && depth === 0) {
          const trimmed = current.trim();
          if (trimmed) statements.push(trimmed);
          current = '';
        } else {
          current += char;
        }
      }
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);

      for (const stmt of statements) {
        await db.run(stmt);
      }

      await db.run('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`Applied ${file}`);
    }

    console.log('All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

migrate();
