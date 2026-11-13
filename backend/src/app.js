import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { getCacheStats } from './config/redis.js';
import apiRouter from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Core Middlewares & CORS Configuration
const configuredOrigins = Array.isArray(env.CORS_ORIGIN)
  ? env.CORS_ORIGIN
  : typeof env.CORS_ORIGIN === 'string'
  ? env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [env.CORS_ORIGIN];

// Combine configured origins with existing allowed domains to support local and live environments
const allowedOrigins = [
  ...new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://oneassist.net.in',
    'https://www.oneassist.net.in',
  ]),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('oneassist.net.in')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true, // Enables HttpOnly cookies across origins
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 2. Static File Uploads Directory
const apiBasePath = env.API_BASE_PATH ? env.API_BASE_PATH.replace(/\/+$/, '') : '/itcrmapi';
const staticUploadPaths = ['/uploads'];
if (apiBasePath && apiBasePath !== '') {
  staticUploadPaths.push(`${apiBasePath}/uploads`);
}
app.use(staticUploadPaths, express.static(path.join(__dirname, '../uploads')));

// 3. Health Check & Cache Status Endpoint
const healthHandler = async (_req, res) => {
  const cacheStats = await getCacheStats();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'ITech CRM API',
    cacheEngine: cacheStats,
  });
};

const healthEndpoints = ['/api/health'];
if (apiBasePath && apiBasePath !== '' && apiBasePath !== '/api') {
  healthEndpoints.push(`${apiBasePath}/health`, `${apiBasePath}/api/health`);
}
app.get(healthEndpoints, healthHandler);

// 4. Mount API Routes using env.API_BASE_PATH and default /api fallback
if (apiBasePath && apiBasePath !== '' && apiBasePath !== '/api') {
  app.use(`${apiBasePath}/api`, apiRouter);
  app.use(apiBasePath, apiRouter);
}
app.use('/api', apiRouter);

// 5. 404 Route Not Found Handler
app.use(notFoundHandler);

// 6. Global Exception & Error Handler
app.use(errorHandler);

export default app;
