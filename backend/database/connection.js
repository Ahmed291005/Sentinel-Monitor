/**
 * database/connection.js
 *
 * SQL Server connection pool using 'mssql' package.
 * Authentication: SQL Server Authentication (sa login)
 * Server: localhost\SQLEXPRESS
 *
 * Works with: SQL Server 2019, 2022, SSMS 22
 */

const sql = require('mssql');
require('dotenv').config();

// ── Connection Configuration ──────────────────────────────────────────────────
const config = {
  server:   process.env.DB_SERVER   || 'localhost\\SQLEXPRESS',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME     || 'SentinelDB',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || 'Sentinel@123',
  options: {
    encrypt:                process.env.DB_ENCRYPT    === 'true' ? true : false,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true' ? true : false,
    enableArithAbort:       true,
    instanceName:           'SQLEXPRESS',
  },
  pool: {
    max:               10,
    min:               0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout:    30000,
};

// ── Singleton Pool Instance ───────────────────────────────────────────────────
let pool = null;

/**
 * getPool()
 * Returns the active connection pool.
 * Creates it on first call — reused for every query after that.
 */
async function getPool() {
  if (pool) return pool;

  try {
    pool = await sql.connect(config);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[DB] ✓ Connected to SQL Server');
    console.log(`[DB]   Server   → ${config.server}`);
    console.log(`[DB]   Database → ${config.database}`);
    console.log(`[DB]   User     → ${config.user}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return pool;

  } catch (err) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[DB] ✗ Connection failed!');
    console.error(`[DB]   Error → ${err.message}`);
    console.error('[DB]   Check the following:');
    console.error('[DB]   1. SQL Server is running (restart from SSMS)');
    console.error('[DB]   2. sa login is enabled in SSMS Security → Logins → sa');
    console.error('[DB]   3. SentinelDB exists in SSMS → Databases');
    console.error('[DB]   4. Password in .env matches sa password in SSMS');
    console.error('[DB]   5. SQL Server and Windows Auth mode ON in Server Properties');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw err;
  }
}

// ── Query Helpers ─────────────────────────────────────────────────────────────

/**
 * query(sql_string, params)
 * Runs a SELECT — returns ALL rows as an array.
 *
 * Example:
 *   const users = await query(
 *     'SELECT * FROM users WHERE role = @role',
 *     { role: 'admin' }
 *   );
 */
async function query(sql_string, params = {}) {
  const p       = await getPool();
  const request = p.request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  const result = await request.query(sql_string);
  return result.recordset;
}

/**
 * queryOne(sql_string, params)
 * Runs a SELECT — returns ONLY the first row (or null if not found).
 *
 * Example:
 *   const user = await queryOne(
 *     'SELECT * FROM users WHERE id = @id',
 *     { id: 1 }
 *   );
 */
async function queryOne(sql_string, params = {}) {
  const rows = await query(sql_string, params);
  return rows[0] || null;
}

/**
 * execute(sql_string, params)
 * Runs INSERT / UPDATE / DELETE.
 * Returns full result including recordset (for OUTPUT INSERTED.id)
 * and rowsAffected count.
 *
 * Example:
 *   const result = await execute(
 *     'INSERT INTO users (username) OUTPUT INSERTED.id VALUES (@username)',
 *     { username: 'admin' }
 *   );
 *   const newId = result.recordset[0].id;
 */
async function execute(sql_string, params = {}) {
  const p       = await getPool();
  const request = p.request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  return await request.query(sql_string);
}

/**
 * closePool()
 * Gracefully closes all connections in the pool.
 * Called automatically on app shutdown.
 */
async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('[DB] Connection pool closed gracefully.');
  }
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT',  async () => { await closePool(); process.exit(0); });
process.on('SIGTERM', async () => { await closePool(); process.exit(0); });

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = { getPool, query, queryOne, execute, closePool, sql };
