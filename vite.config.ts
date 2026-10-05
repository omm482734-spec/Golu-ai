import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import express from 'express';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { setupLiveWebSocket } from './server/gemini-live-server';
import { createApiRouter } from './server/api-routes';

dotenv.config();

function liveAssistantPlugin(): Plugin {
  return {
    name: 'golu-rani-live-server',
    configureServer(server) {
      const app = express();
      app.use('/api', createApiRouter());
      server.middlewares.use(app);

      if (server.httpServer) {
        const wss = new WebSocketServer({ noServer: true });
        setupLiveWebSocket(wss);

        server.httpServer.on('upgrade', (request, socket, head) => {
          socket.on('error', (err: any) => {
            console.warn('[ViteUpgrade] Socket warning (handled):', err?.message || err);
          });

          try {
            const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
            if (pathname === '/live' || pathname === '/api/live') {
              wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
              });
            }
          } catch (err: any) {
            console.warn('[ViteUpgrade] Upgrade parse warning:', err?.message);
          }
        });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), liveAssistantPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

