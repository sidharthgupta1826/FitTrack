// Vercel Serverless Function: /api/sync
// Supports bidirectional synchronization between FitTrack Android Companion App and Web PWA

// Global memory cache for serverless invocation lifecycle
const syncStore = new Map<string, {
  syncToken: string;
  deviceId?: string;
  deviceModel?: string;
  source?: string;
  lastSyncTime: string;
  records: Array<{
    date: string;
    steps: number;
    distanceKm?: number;
    calories?: number;
    activeMinutes?: number;
    source: string;
  }>;
}>();

export default function handler(req: any, res: any) {
  // CORS configuration for mobile and cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/sync?token=FT-7492A1
  if (req.method === 'GET') {
    const token = (req.query?.token || req.headers?.['x-sync-token']) as string;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter "token" or header "X-Sync-Token".',
      });
    }

    const data = syncStore.get(token.trim().toUpperCase());
    if (!data) {
      return res.status(200).json({
        success: true,
        hasData: false,
        syncToken: token,
        message: 'No pending records found for this pairing token.',
        records: [],
      });
    }

    return res.status(200).json({
      success: true,
      hasData: true,
      ...data,
    });
  }

  // POST /api/sync (From Android Companion App or Web Client)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const token = (body.syncToken || req.headers?.['x-sync-token'])?.trim()?.toUpperCase();

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field "syncToken".',
        });
      }

      const records = Array.isArray(body.records) ? body.records : [];
      const timestamp = body.syncTimestamp || new Date().toISOString();

      const payload = {
        syncToken: token,
        deviceId: body.deviceId || 'Android-Device',
        deviceModel: body.deviceModel || 'Android Companion App',
        source: body.source || 'health_connect',
        lastSyncTime: timestamp,
        records,
      };

      syncStore.set(token, payload);

      return res.status(200).json({
        success: true,
        message: `Successfully synchronized ${records.length} records.`,
        recordsReceived: records.length,
        syncTimestamp: timestamp,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Sync processing error: ${err.message}`,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
