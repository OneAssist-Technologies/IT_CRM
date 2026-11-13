import pkg from 'pg';
import { env } from './env.js';

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client pool:', err);
});

/**
 * Execute parameterized query safely
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development' && duration > 500) {
    console.warn(`Slow SQL query (${duration}ms):`, text);
  }
  return res;
}

/**
 * Helper to get a transaction client
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

export default {
  pool,
  query,
  getClient,
};
