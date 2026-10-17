import { db, upsertDailyActivity } from '../db';
import { ActivitySource, DailyActivity } from '../types';
import { stepsToCalories, stepsToKm } from '../utils/calculations';

export interface RemoteSyncResponse {
  success: boolean;
  hasData?: boolean;
  syncToken?: string;
  deviceId?: string;
  deviceModel?: string;
  source?: ActivitySource;
  lastSyncTime?: string;
  records: Array<{
    date: string;
    steps: number;
    distanceKm?: number;
    calories?: number;
    activeMinutes?: number;
    source: ActivitySource;
  }>;
  message?: string;
  error?: string;
}

/**
 * Get current synchronization server URL
 * Defaults to current origin + /api/sync (works for both localhost and Vercel production)
 */
export function getEffectiveSyncServerUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}/api/sync`;
}

/**
 * Generate a random pairing token (e.g. FT-7492A1)
 */
export function generatePairingToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'FT-';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Poll or fetch synchronization records from the FitTrack sync API
 */
export async function fetchRemoteSyncData(
  syncToken: string,
  serverUrl?: string
): Promise<{
  success: boolean;
  importedCount: number;
  message: string;
  deviceModel?: string;
  lastSyncTime?: string;
  source?: ActivitySource;
}> {
  if (!syncToken) {
    return {
      success: false,
      importedCount: 0,
      message: 'Pairing token is not configured.',
    };
  }

  const endpoint = getEffectiveSyncServerUrl(serverUrl);
  const url = `${endpoint}?token=${encodeURIComponent(syncToken.trim().toUpperCase())}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Sync-Token': syncToken.trim().toUpperCase(),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        importedCount: 0,
        message: `Sync server returned HTTP ${response.status}: ${errText.slice(0, 100)}`,
      };
    }

    const data: RemoteSyncResponse = await response.json();

    if (!data.success) {
      return {
        success: false,
        importedCount: 0,
        message: data.error || 'Server indicated synchronization error.',
      };
    }

    if (!data.hasData || !data.records || data.records.length === 0) {
      return {
        success: true,
        importedCount: 0,
        message: `No new records found on server for token ${syncToken}. Ensure your Android companion app has synchronized.`,
        lastSyncTime: data.lastSyncTime,
      };
    }

    let importedCount = 0;
    for (const rec of data.records) {
      const steps = Number(rec.steps) || 0;
      if (steps > 0 && rec.date) {
        const source = (rec.source || data.source || 'health_connect') as ActivitySource;
        await upsertDailyActivity({
          date: rec.date,
          steps,
          source,
          distanceKm: rec.distanceKm || stepsToKm(steps),
          calories: rec.calories || stepsToCalories(steps),
          activeMinutes: rec.activeMinutes,
        });
        importedCount++;
      }
    }

    return {
      success: true,
      importedCount,
      message: `Successfully synchronized ${importedCount} records from ${data.deviceModel || 'Android device'}.`,
      deviceModel: data.deviceModel,
      lastSyncTime: data.lastSyncTime || new Date().toISOString(),
      source: data.source || 'health_connect',
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      message: `Network error reaching sync endpoint: ${err.message || 'Check connection'}`,
    };
  }
}
