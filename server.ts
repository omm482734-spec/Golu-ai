import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { setupLiveWebSocket } from './server/gemini-live-server';
import { createApiRouter } from './server/api-routes';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer(app);

// Mount API routes
const apiRouter = createApiRouter();
app.use('/api', apiRouter);

// Mount WebSocket server
const wss = new WebSocketServer({ noServer: true });
setupLiveWebSocket(wss);

server.on('upgrade', (request, socket, head) => {
  socket.on('error', (err: any) => {
    console.warn('[ServerUpgrade] Socket warning (handled):', err?.message || err);
  });

  try {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/live' || pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (err: any) {
    console.warn('[ServerUpgrade] Upgrade parse warning:', err?.message);
  }
});

// Serve frontend static files
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Golu Rani AI Server listening on port ${port}`);
});
