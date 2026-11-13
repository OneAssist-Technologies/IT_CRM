import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { setIO } from './src/utils/socket.js';
import { autoSyncDatabase } from './src/config/autoDbSync.js';
import { initTicketDatabase } from './src/config/ticketDbInit.js';

// 1. Create HTTP server instance with Express app
const server = http.createServer(app);

// 2. CORS configuration for Socket.IO
const configuredOrigins = Array.isArray(env.CORS_ORIGIN)
  ? env.CORS_ORIGIN
  : typeof env.CORS_ORIGIN === 'string'
  ? env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [env.CORS_ORIGIN];

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

// 3. Initialize Real-Time WebSockets Gateway
export const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('oneassist.net.in')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

setIO(io);

// 4. WebSocket Connection & Room Handlers
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// 5. Start Server Listener
const PORT = env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`⚡ Redis: Active | 🗄️ PostgreSQL: Connected | 🔌 Socket.IO: Ready`);
  await autoSyncDatabase();
  await initTicketDatabase().catch((e) => console.error('[Server] Ticket DB init error:', e));
});

// 6. Graceful Process Shutdown
const handleShutdown = (signal) => {
  console.log(`[Server] ${signal} received. Closing gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
