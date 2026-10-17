import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, upsertDailyActivity } from '../db';
import {
  getTodayString,
  formatFriendlyDate,
  formatShortDate,
  formatNumber,
  formatDistance,
  stepsToKm,
  stepsToCalories,
  stepsToActiveMinutes,
} from '../utils/calculations';
import {
  importHealthDataFromFile,
  ANDROID_COMPANION_SPEC,
} from '../services/healthConnect';
import { getEffectiveSyncServerUrl } from '../services/syncApi';
import { ProgressRing } from '../components/ProgressRing';
import { Modal } from '../components/Modal';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Smartphone,
  UploadCloud,
  FileCode,
  CheckCircle,
  Clock,
  Footprints,
  Flame,
  Info,
  Trash2,
  Copy,
  Cpu,
  HeartPulse,
  RefreshCw,
} from 'lucide-react';

interface ActivityProps {
  onOpenLogModal: (date?: string) => void;
}

export const Activity: React.FC<ActivityProps> = ({ onOpenLogModal }) => {
  const { goals, profile, syncStatus, triggerSync, showToast, refreshAll } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load all activities
  const allActivities = useLiveQuery(() => db.dailyActivities.toArray()) || [];

  // Sort activities in descending order (newest first)
  const sortedActivities = useMemo(() => {
    return [...allActivities].sort((a, b) => b.date.localeCompare(a.date));
  }, [allActivities]);

  // Selected date record
  const selectedRecord = useMemo(() => {
    return allActivities.find((a) => a.date === selectedDate);
  }, [allActivities, selectedDate]);

  const selectedSteps = selectedRecord?.steps || 0;
  const selectedDist = selectedRecord?.distanceKm || stepsToKm(selectedSteps);
  const selectedCal = selectedRecord?.calories || stepsToCalories(selectedSteps);
  const selectedActiveMins =
    selectedRecord?.activeMinutes || stepsToActiveMinutes(selectedSteps);
  const goalPercentage = Math.round((selectedSteps / goals.dailyStepGoal) * 100);

  // Navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleJumpToToday = () => {
    setSelectedDate(getTodayString());
  };

  const handleDeleteEntry = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this step entry?')) {
      await db.dailyActivities.delete(id);
      showToast('Step entry deleted.');
      await refreshAll();
    }
  };

  const handleHealthSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = await importHealthDataFromFile(content, file.name);
      setIsUploading(false);

      if (result.success) {
        showToast(result.message, 'success');
        await refreshAll();
      } else {
        showToast(result.message, 'error');
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      showToast('Error reading file.', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const currentSyncUrl = getEffectiveSyncServerUrl(profile.syncServerUrl);
  const currentSyncToken = profile.syncToken || 'FT-7492A1';

  const renderSourceBadge = (source?: string) => {
    switch (source) {
      case 'health_connect':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <HeartPulse className="w-3 h-3 text-emerald-600" />
            Health Connect
          </span>
        );
      case 'sensor':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
            <Cpu className="w-3 h-3 text-teal-600" />
            Step Sensor
          </span>
        );
      case 'imported':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
            File Import
          </span>
        );
      case 'demo':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Demo Sample
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
            Manual Entry
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            Daily Step Tracking
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Automatic Android synchronization, manual entries, and historical step logs.
          </p>
        </div>

        <button
          onClick={() => onOpenLogModal(selectedDate)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Step Entry</span>
        </button>
      </div>

      {/* Date Navigator & Selected Day Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        {/* Date Selector Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-sm font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {selectedDate !== getTodayString() && (
              <button
                onClick={handleJumpToToday}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors ml-1"
              >
                Today
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {formatFriendlyDate(selectedDate)}
            </span>
            {selectedRecord && (
              <button
                onClick={() => onOpenLogModal(selectedDate)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                title="Edit this entry"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Date Stats */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-6">
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <ProgressRing
              current={selectedSteps}
              goal={goals.dailyStepGoal}
              size={210}
              strokeWidth={16}
              label="Steps"
              sublabel={
                selectedRecord
                  ? `${goalPercentage}% of goal`
                  : 'No steps recorded'
              }
            />
          </div>

          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-900">
                {selectedRecord ? 'Activity Summary' : 'No Activity Recorded Yet'}
              </h3>
              {selectedRecord && renderSourceBadge(selectedRecord.source)}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                  Distance
                </span>
                <p className="text-lg font-bold text-navy-900 mt-1">
                  {formatDistance(selectedDist, profile.preferredUnits)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  Burned
                </span>
                <p className="text-lg font-bold text-navy-900 mt-1">
                  {formatNumber(selectedCal)}{' '}
                  <span className="text-xs font-normal text-slate-500">kcal</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  Active
                </span>
                <p className="text-lg font-bold text-navy-900 mt-1">
                  {selectedActiveMins} <span className="text-xs font-normal text-slate-500">mins</span>
                </p>
              </div>
            </div>

            {!selectedRecord ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-600">
                  Ready to record steps for {formatShortDate(selectedDate)}?
                </p>
                <button
                  onClick={() => onOpenLogModal(selectedDate)}
                  className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  + Add Step Record
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Last updated: {new Date(selectedRecord.updatedAt || selectedRecord.createdAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Android Health Connect & Native Step Sensor Integration Hub */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-navy-900">
                  Android Automatic Step Tracking Hub
                </h3>
                {syncStatus.isNativeBridgeActive ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Native Bridge Connected
                  </span>
                ) : syncStatus.isConnected ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    Cloud Synced
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Manual Fallback Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                FitTrack pairs with our native Android Companion App using <strong>Google Health Connect</strong> (aggregated daily steps with deduplication) and device hardware sensors (<code>TYPE_STEP_COUNTER</code>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSpecModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Companion Spec</span>
            </button>
          </div>
        </div>

        {/* Pairing Tokens & Credentials Box */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Your Companion Pairing Token
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-navy-900 font-mono tracking-wider">
                {currentSyncToken}
              </span>
              <button
                onClick={() => handleCopyText(currentSyncToken, 'Pairing Token')}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-navy-900 transition-colors"
                title="Copy Pairing Token"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Enter this pairing token into the FitTrack Android Companion App settings.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sync Endpoint URL
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-navy-900 font-mono truncate max-w-xs">
                {currentSyncUrl}
              </span>
              <button
                onClick={() => handleCopyText(currentSyncUrl, 'Sync Server URL')}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-navy-900 transition-colors shrink-0"
                title="Copy Server URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Default server endpoint for automatic cloud background synchronization.
            </p>
          </div>
        </div>

        {/* Action Connectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Connector 1: Synchronize Now */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-navy-900">Sync with Companion</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Fetches latest steps from Health Connect and hardware sensor via bridge or API.
              </p>
            </div>
            <button
              onClick={handleHealthSync}
              disabled={isSyncing}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Sync...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Sync Now</span>
                </>
              )}
            </button>
          </div>

          {/* Connector 2: Import Health Export File */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-navy-900">File Import Fallback</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload CSV or JSON exports from Samsung Health, Google Takeout, or Health Connect.
              </p>
            </div>
            <label className="mt-4 w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-navy-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95">
              <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isUploading ? 'Importing...' : 'Upload File'}</span>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Connector 3: Connection Status Details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-navy-900">Connection Health</span>
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus.isNativeBridgeActive
                      ? 'bg-emerald-500'
                      : syncStatus.isConnected
                      ? 'bg-sky-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-xs font-bold text-navy-900 capitalize">
                  {syncStatus.isNativeBridgeActive
                    ? 'In-App Native Bridge'
                    : syncStatus.isConnected
                    ? 'REST API Connected'
                    : 'Manual Fallback'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {syncStatus.lastSyncTime
                  ? `Last sync: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Awaiting companion sync'}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Status: {syncStatus.statusMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Step History Log Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Activity History</h3>
            <p className="text-xs text-slate-500">
              {sortedActivities.length} days recorded in local IndexedDB
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Steps</th>
                <th className="py-3 px-3">Goal Progress</th>
                <th className="py-3 px-3">Distance</th>
                <th className="py-3 px-3">Calories</th>
                <th className="py-3 px-3">Source Tag</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedActivities.map((act) => {
                const percent = Math.round((act.steps / goals.dailyStepGoal) * 100);
                return (
                  <tr key={act.id || act.date} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-navy-900">
                      {formatShortDate(act.date)}
                    </td>
                    <td className="py-3 px-3 font-extrabold text-emerald-700">
                      {formatNumber(act.steps)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percent >= 100 ? 'bg-emerald-600' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">{percent}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatDistance(act.distanceKm, profile.preferredUnits)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatNumber(act.calories)} kcal
                    </td>
                    <td className="py-3 px-3">
                      {renderSourceBadge(act.source)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenLogModal(act.date)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                          title="Edit steps"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(act.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Android Companion App Bridge Spec Modal */}
      <Modal
        isOpen={showSpecModal}
        onClose={() => setShowSpecModal(false)}
        title="Android Companion Architecture Specification"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            The FitTrack Android Companion App runs on Android 8.0+ devices, accessing Google Health Connect and the hardware pedometer sensor:
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
            <pre>{ANDROID_COMPANION_SPEC.trim()}</pre>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-900 text-xs">
            <strong>Key Benefit:</strong> Health Connect aggregation prevents double-counting by deduplicating overlapping step counts from wearables and phones.
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowSpecModal(false)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
