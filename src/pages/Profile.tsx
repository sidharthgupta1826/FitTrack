import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, exportAllData, importData, resetAllData, clearDemoData, seedDemoData } from '../db';
import {
  User,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Smartphone,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile, updateProfile, goals, showToast, refreshAll, canInstallPwa, installPwa } =
    useApp();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [preferredUnits, setPreferredUnits] = useState<'km' | 'miles'>(profile.preferredUnits);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('Please enter a display name.', 'error');
      return;
    }
    await updateProfile({
      displayName: displayName.trim(),
      preferredUnits,
    });
  };

  // Export data as JSON download
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const jsonString = await exportAllData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `fittrack-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Fitness data exported successfully!', 'success');
    } catch (err: any) {
      showToast(`Export error: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Import data from backup file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importData(content);
      setIsImporting(false);
      if (res.success) {
        showToast(res.message, 'success');
        await refreshAll();
      } else {
        showToast(res.message, 'error');
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      showToast('Failed to read file.', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear demo data
  const handleClearDemoOnly = async () => {
    if (window.confirm('Clear all demo preview records from your database?')) {
      const count = await clearDemoData();
      showToast(`Removed ${count} demo records.`, 'info');
      await refreshAll();
    }
  };

  // Re-seed demo data
  const handleReseedDemo = async () => {
    if (window.confirm('Load sample fitness data for the last 14 days?')) {
      await seedDemoData();
      showToast('Sample demo data loaded!', 'success');
      await refreshAll();
    }
  };

  // Reset entire database
  const handleResetEverything = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete ALL records and reset FitTrack to defaults? This action cannot be undone.'
      )
    ) {
      await resetAllData();
      showToast('Database reset to defaults.', 'info');
      await refreshAll();
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
          Profile & Preferences
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Manage your account preferences, measurement units, data backups, and privacy controls.
        </p>
      </div>

      {/* Profile & Units Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <h3 className="text-lg font-bold text-navy-900 mb-1">User Settings</h3>
        <p className="text-xs text-slate-500 mb-6">
          Customized display information and unit preferences
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-navy-900">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-navy-900">Preferred Distance Unit</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPreferredUnits('km')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  preferredUnits === 'km'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Kilometers (km)
              </button>
              <button
                type="button"
                onClick={() => setPreferredUnits('miles')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  preferredUnits === 'miles'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Miles (mi)
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-navy-900 flex items-center justify-between">
              <span>Android Companion Pairing Token</span>
              <span className="text-[11px] font-mono text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded">
                {profile.syncToken || 'FT-7492A1'}
              </span>
            </label>
            <p className="text-[11px] text-slate-500">
              Provide this key to the FitTrack Android Companion App to authenticate background step transfers.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* PWA & Installation Status */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">
                Progressive Web App (PWA)
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-lg">
                Install FitTrack to your smartphone home screen for full-screen view, offline support, and quick access.
              </p>
            </div>
          </div>

          {canInstallPwa ? (
            <button
              onClick={installPwa}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md transition-all self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Install to Home Screen</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 self-start sm:self-auto">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>PWA Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Data Management: Backup & Export */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6">
        <div>
          <h3 className="text-lg font-bold text-navy-900">Data Management & Privacy</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            All your activity and workout logs are stored locally on your device in IndexedDB.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export JSON */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-600" />
                Export Full Backup
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Download all your daily step entries, workouts, goals, and history in a standard JSON format.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="mt-4 py-2 px-4 rounded-xl bg-white border border-slate-200 text-navy-900 text-xs font-bold hover:border-emerald-400 hover:bg-emerald-50/40 transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isExporting ? 'Generating JSON...' : 'Download JSON Backup'}</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                Restore from Backup
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Import and restore a previously saved FitTrack JSON file into your local database.
              </p>
            </div>
            <label className="mt-4 py-2 px-4 rounded-xl bg-white border border-slate-200 text-navy-900 text-xs font-bold hover:border-emerald-400 hover:bg-emerald-50/40 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isImporting ? 'Importing...' : 'Select Backup File'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Demo Data & Reset Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearDemoOnly}
              className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl transition-colors"
            >
              Clear Demo Data
            </button>
            <button
              onClick={handleReseedDemo}
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
            >
              Load Demo Data
            </button>
          </div>

          <button
            onClick={handleResetEverything}
            className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors self-end sm:self-auto"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Reset All Database Data</span>
          </button>
        </div>
      </div>

      {/* Privacy Transparency Notice */}
      <div className="p-6 rounded-3xl bg-emerald-50/60 border border-emerald-100/80 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <h4 className="font-bold">Privacy & Reliability Guarantee</h4>
          <p className="text-emerald-900/80 leading-relaxed">
            FitTrack operates strictly offline-first using client-side IndexedDB. We never track your location in the background. GPS is only active when you explicitly press "Start Workout", and calorie numbers are always clearly labeled as approximate MET estimates.
          </p>
        </div>
      </div>
    </div>
  );
};
