import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Flame, RefreshCw, Smartphone } from 'lucide-react';
import { db } from '../db';
import { calculateStreaks } from '../utils/achievements';
import { useLiveQuery } from 'dexie-react-hooks';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, goals, syncStatus, canInstallPwa, installPwa } = useApp();

  const activities = useLiveQuery(() => db.dailyActivities.toArray()) || [];
  const streakInfo = calculateStreaks(activities, goals.dailyStepGoal);

  const [currentDateFormatted, setCurrentDateFormatted] = useState('');

  useEffect(() => {
    const today = new Date();
    setCurrentDateFormatted(
      today.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    );
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:bg-emerald-700 transition-colors">
            <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" fill="none">
              <path
                d="M22 56C28 56 32 44 38 44C44 44 46 64 52 64C58 64 62 34 68 34C74 34 78 52 82 52"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="68" cy="24" r="6" fill="#34D399" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-navy-900 group-hover:text-emerald-700 transition-colors">
                Fit<span className="text-emerald-600">Track</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Health
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {currentDateFormatted}
            </p>
          </div>
        </div>

        {/* Right Actions: Streak, PWA Install, Sync Status */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Active Streak */}
          <div
            onClick={() => setActiveTab('goals')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 cursor-pointer hover:bg-amber-100/70 transition-colors"
            title={`${streakInfo.currentStreak} day goal streak`}
          >
            <Flame className={`w-4 h-4 ${streakInfo.currentStreak > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-xs font-bold text-amber-900">
              {streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Android Sync Status Indicator */}
          <button
            onClick={() => setActiveTab('activity')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              syncStatus.isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{syncStatus.isConnected ? 'Health Connect' : 'Sync Android'}</span>
          </button>

          {/* Install PWA Button */}
          {canInstallPwa && (
            <button
              onClick={installPwa}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Profile Avatar */}
          <div
            onClick={() => setActiveTab('profile')}
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors text-xs font-bold text-navy-900"
            title="Profile & Settings"
          >
            AR
          </div>
        </div>
      </div>
    </header>
  );
};
