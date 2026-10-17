import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// In-memory sync store for local development testing
const devSyncStore = new Map<string, any>();

function devSyncApiPlugin(): Plugin {
  return {
    name: 'dev-sync-api',
    configureServer(server) {
      server.middlewares.use('/api/sync', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-Token');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const tokenFromQuery = url.searchParams.get('token');
        const tokenFromHeader = (req.headers['x-sync-token'] as string) || '';

        if (req.method === 'GET') {
          const token = (tokenFromQuery || tokenFromHeader || '').trim().toUpperCase();
          if (!token) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'Missing token' }));
          }

          const data = devSyncStore.get(token);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify(
              data
                ? { success: true, hasData: true, ...data }
                : { success: true, hasData: false, syncToken: token, records: [] }
            )
          );
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const token = (parsed.syncToken || tokenFromHeader || '').trim().toUpperCase();
              if (!token) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'Missing syncToken' }));
              }

              const payload = {
                syncToken: token,
                deviceId: parsed.deviceId || 'Android-Companion',
                deviceModel: parsed.deviceModel || 'Android Device',
                source: parsed.source || 'health_connect',
                lastSyncTime: parsed.syncTimestamp || new Date().toISOString(),
                records: Array.isArray(parsed.records) ? parsed.records : [],
              };

              devSyncStore.set(token, payload);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  message: `Synced ${payload.records.length} records in dev environment.`,
                  recordsReceived: payload.records.length,
                  syncTimestamp: payload.lastSyncTime,
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        return res.end();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devSyncApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    host: true,
  },
});
