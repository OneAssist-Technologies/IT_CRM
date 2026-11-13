import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables from backend .env and working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// 2. Validate critical required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter((key) => !process.env[key] || !process.env[key].trim());

if (missingVars.length > 0) {
  console.error('\n❌ [Environment Config Error] Missing required environment variable(s):');
  missingVars.forEach((key) => console.error(`   - ${key}`));
  console.error('Please configure these in your backend .env file before starting the application.\n');
  process.exit(1);
}

// 3. Parse and structure CORS origins (supports single origin or comma-separated list)
const rawCorsOrigin = (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || '').trim();
let corsOriginConfig = 'http://localhost:5173';

if (rawCorsOrigin) {
  if (rawCorsOrigin.includes(',')) {
    corsOriginConfig = rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  } else {
    corsOriginConfig = rawCorsOrigin;
  }
}

// 4. Export validated configuration object
export const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL.trim(),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET.trim(),
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '7d',
  CORS_ORIGIN: corsOriginConfig,
  API_BASE_PATH: (process.env.API_BASE_PATH || '/itcrmapi').trim(),
};

export default env;
