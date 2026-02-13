const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = {
  async one(sql, params = []) {
    const { rows } = await pool.query(sql, params);
    return rows[0] || null;
  },

  async many(sql, params = []) {
    const { rows } = await pool.query(sql, params);
    return rows;
  },

  async run(sql, params = []) {
    const result = await pool.query(sql, params);
    return { rowCount: result.rowCount, rows: result.rows };
  },

  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        async one(sql, params = []) {
          const { rows } = await client.query(sql, params);
          return rows[0] || null;
        },
        async many(sql, params = []) {
          const { rows } = await client.query(sql, params);
          return rows;
        },
        async run(sql, params = []) {
          const result = await client.query(sql, params);
          return { rowCount: result.rowCount, rows: result.rows };
        },
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  pool,
};

module.exports = db;
