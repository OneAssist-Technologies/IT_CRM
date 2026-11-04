import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/IT_CRM?schema=public';

export const pool = new Pool({
  connectionString,
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
  if (process.env.NODE_ENV === 'development' && duration > 500) {
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

