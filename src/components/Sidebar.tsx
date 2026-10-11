import React from 'react';
import { useApp, TabType } from '../context/AppContext';
import {
  LayoutDashboard,
  Footprints,
  Activity,
  BarChart3,
  Target,
  Settings,
  Flame,
  Smartphone,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getTodayString } from '../utils/calculations';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, goals } = useApp();
  const todayStr = getTodayString();
  const todayActivity = useLiveQuery(() =>
    db.dailyActivities.where('date').equals(todayStr).first()
  );

  const todaySteps = todayActivity?.steps || 0;
  const progressPercent = Math.min(Math.round((todaySteps / goals.dailyStepGoal) * 100), 100);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'activity', label: 'Daily Steps', icon: <Footprints className="w-5 h-5" /> },
    { id: 'workouts', label: 'Workouts', icon: <Activity className="w-5 h-5" /> },
    { id: 'insights', label: 'Insights & Reports', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'goals', label: 'Goals & Badges', icon: <Target className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile & Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 min-h-[calc(100vh-4rem)] p-4 shrink-0">
      {/* Navigation links */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all text-left ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                {item.icon}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-5 rounded-full bg-emerald-600" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Daily Progress Widget in Sidebar */}
      <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 mt-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span>Today's Target</span>
          <span className="text-emerald-700 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
          <span>{todaySteps.toLocaleString()} steps</span>
          <span>Goal: {goals.dailyStepGoal.toLocaleString()}</span>
        </div>
      </div>
    </aside>
  );
};
