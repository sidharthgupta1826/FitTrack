import { db, upsertDailyActivity } from '../db';
import { SyncStatus, ActivitySource } from '../types';
import { stepsToCalories, stepsToKm, toDateString } from '../utils/calculations';
import { fetchRemoteSyncData, getEffectiveSyncServerUrl } from './syncApi';

const SYNC_STATUS_KEY = 'fittrack_health_sync_status';

export interface HealthConnectSyncResult {
  success: boolean;
  importedRecordsCount: number;
  message: string;
  source: ActivitySource;
  deviceModel?: string;
  isNativeBridge?: boolean;
}

/**
 * Get current sync status from local storage
 */
export function getStoredSyncStatus(): SyncStatus {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore parse error
  }

  // Check if loaded inside native companion webview
  const hasBridge = typeof window !== 'undefined' && typeof (window as any).FitTrackAndroidBridge !== 'undefined';

  return {
    isConnected: hasBridge,
    provider: hasBridge ? 'android_companion' : 'manual',
    statusMessage: hasBridge
      ? 'Connected directly to Native Android Companion Bridge.'
      : 'Manual fallback active. Connect Android Companion App for automatic tracking.',
    isNativeBridgeActive: hasBridge,
  };
}

/**
 * Persist sync status
 */
export function saveSyncStatus(status: SyncStatus) {
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
}

/**
 * Synchronize with Android Health Connect or Native Step Sensor
 * Checks native bridge first, then remote companion API endpoint.
 * Never fabricates synthetic values.
 */
export async function performHealthConnectSync(options?: {
  syncToken?: string;
  syncServerUrl?: string;
}): Promise<HealthConnectSyncResult> {
  const hasNativeBridge =
    typeof window !== 'undefined' && typeof (window as any).FitTrackAndroidBridge !== 'undefined';

  // 1. Direct in-app native companion bridge (WebView JavaScriptInterface)
  if (hasNativeBridge) {
    try {
      const nativeBridge = (window as any).FitTrackAndroidBridge;
      const rawData = await nativeBridge.fetchHealthConnectSteps();
      const records = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      if (!Array.isArray(records) || records.length === 0) {
        return {
          success: false,
          importedRecordsCount: 0,
          message: 'Native bridge connected, but no step records were returned from Health Connect or sensor. Verify permissions in the companion app.',
          source: 'health_connect',
          isNativeBridge: true,
        };
      }

      let importedCount = 0;
      for (const rec of records) {
        const steps = Number(rec.steps) || 0;
        if (steps > 0 && rec.date) {
          const source = (rec.source === 'sensor' ? 'sensor' : 'health_connect') as ActivitySource;
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

      const syncStatus: SyncStatus = {
        isConnected: true,
        lastSyncTime: new Date().toISOString(),
        provider: 'android_companion',
        statusMessage: `Synchronized ${importedCount} records via Native Android Bridge.`,
        isNativeBridgeActive: true,
      };
      saveSyncStatus(syncStatus);

      return {
        success: true,
        importedRecordsCount: importedCount,
        message: `Successfully synchronized ${importedCount} records from Android Companion.`,
        source: 'health_connect',
        isNativeBridge: true,
      };
    } catch (e: any) {
      return {
        success: false,
        importedRecordsCount: 0,
        message: `Native bridge communication error: ${e.message}`,
        source: 'health_connect',
        isNativeBridge: true,
      };
    }
  }

  // 2. Remote synchronization API (when running in standard web browser)
  const token = options?.syncToken || 'FT-7492A1';
  const remoteResult = await fetchRemoteSyncData(token, options?.syncServerUrl);

  if (remoteResult.success && remoteResult.importedCount > 0) {
    const syncStatus: SyncStatus = {
      isConnected: true,
      lastSyncTime: remoteResult.lastSyncTime || new Date().toISOString(),
      provider: remoteResult.source === 'sensor' ? 'sensor' : 'health_connect',
      statusMessage: `Synchronized via FitTrack API (${remoteResult.deviceModel || 'Android App'}).`,
      syncToken: token,
      isNativeBridgeActive: false,
    };
    saveSyncStatus(syncStatus);

    return {
      success: true,
      importedRecordsCount: remoteResult.importedCount,
      message: remoteResult.message,
      source: remoteResult.source || 'health_connect',
      deviceModel: remoteResult.deviceModel,
      isNativeBridge: false,
    };
  }

  // 3. Honest fallback when no bridge and no pending API data
  const syncStatus: SyncStatus = {
    isConnected: false,
    provider: 'manual',
    statusMessage: 'No companion connection. Manual entry active as fallback.',
    syncToken: token,
    isNativeBridgeActive: false,
  };
  saveSyncStatus(syncStatus);

  return {
    success: false,
    importedRecordsCount: 0,
    message: remoteResult.message || 'No records received from Android Companion app. Ensure the companion app is running and synced.',
    source: 'manual',
    isNativeBridge: false,
  };
}

/**
 * Disconnect Android Health platform
 */
export function disconnectHealthPlatform(): SyncStatus {
  const status: SyncStatus = {
    isConnected: false,
    provider: 'manual',
    statusMessage: 'Android companion synchronization disconnected. Manual fallback active.',
    lastSyncTime: undefined,
  };
  saveSyncStatus(status);
  return status;
}

/**
 * Parse and import Samsung Health / Google Fit / Health Connect exported CSV or JSON data
 */
export async function importHealthDataFromFile(
  content: string,
  fileName: string
): Promise<HealthConnectSyncResult> {
  try {
    let importedCount = 0;

    // Check if JSON
    if (fileName.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : parsed.records || parsed.steps || [];

      for (const item of items) {
        if (item.date && (item.steps || item.count)) {
          const steps = Number(item.steps || item.count);
          if (!isNaN(steps) && steps > 0) {
            await upsertDailyActivity({
              date: item.date,
              steps,
              source: 'imported',
              distanceKm: item.distanceKm || stepsToKm(steps),
              calories: item.calories || stepsToCalories(steps),
              activeMinutes: item.activeMinutes,
            });
            importedCount++;
          }
        }
      }
    } else {
      // Parse CSV format (date, steps, ...)
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const startIndex = lines[0].toLowerCase().includes('step') || lines[0].toLowerCase().includes('date') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          const date = parts[0];
          const steps = parseInt(parts[1], 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(steps) && steps >= 0) {
            await upsertDailyActivity({
              date,
              steps,
              source: 'imported',
              distanceKm: stepsToKm(steps),
              calories: stepsToCalories(steps),
            });
            importedCount++;
          }
        }
      }
    }

    if (importedCount === 0) {
      return {
        success: false,
        importedRecordsCount: 0,
        message: 'No valid step records found in file. Format expected: "YYYY-MM-DD,steps" or JSON format.',
        source: 'imported',
      };
    }

    const syncStatus: SyncStatus = {
      isConnected: true,
      lastSyncTime: new Date().toISOString(),
      provider: 'file_import',
      statusMessage: `Imported ${importedCount} records from file.`,
    };
    saveSyncStatus(syncStatus);

    return {
      success: true,
      importedRecordsCount: importedCount,
      message: `Successfully imported ${importedCount} activity records from ${fileName}!`,
      source: 'imported',
    };
  } catch (err: any) {
    return {
      success: false,
      importedRecordsCount: 0,
      message: `File parsing error: ${err.message || 'Check file format'}`,
      source: 'imported',
    };
  }
}

/**
 * Android Companion Architecture documentation snippet
 */
export const ANDROID_COMPANION_SPEC = `
// ========================================================
// FitTrack Android Companion App Bridge Spec (Kotlin)
// Using Google Health Connect Aggregation to Avoid Double-Counting
// ========================================================

class HealthConnectManager(private val context: Context) {
    private val healthConnectClient by lazy { HealthConnectClient.getOrCreate(context) }

    suspend fun getAggregatedDailySteps(startTime: Instant, endTime: Instant): Long {
        // Use Health Connect AGGREGATION to avoid double-counting steps
        // from multiple fitness applications or wearable devices.
        val response = healthConnectClient.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
        )
        return response[StepsRecord.COUNT_TOTAL] ?: 0L
    }
}
`;
