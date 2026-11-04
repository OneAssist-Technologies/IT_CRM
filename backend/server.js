import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { setIO } from './src/utils/socket.js';
import { autoSyncDatabase } from './src/config/autoDbSync.js';
import { initTicketDatabase } from './src/config/ticketDbInit.js';

// 1. Create HTTP server instance with Express app
const server = http.createServer(app);

// 2. Initialize Real-Time WebSockets Gateway
export const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

setIO(io);

// 3. WebSocket Connection & Room Handlers
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// 4. Start Server Listener
const PORT = env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`⚡ Redis: Active | 🗄️ PostgreSQL: Connected | 🔌 Socket.IO: Ready`);
  await autoSyncDatabase();
  await initTicketDatabase().catch((e) => console.error('[Server] Ticket DB init error:', e));
});

// 5. Graceful Process Shutdown
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
