import React from 'react';
import { useApp, TabType } from '../context/AppContext';
import { LayoutDashboard, Footprints, Play, BarChart3, Target, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Today</span>
        </button>

        {/* Daily Steps */}
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'activity' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Footprints className={`w-5 h-5 ${activeTab === 'activity' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Steps</span>
        </button>

        {/* Workouts (Center elevated button) */}
        <button
          onClick={() => setActiveTab('workouts')}
          className="flex flex-col items-center justify-center flex-1 -mt-5"
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              activeTab === 'workouts'
                ? 'bg-emerald-700 text-white ring-4 ring-emerald-100 shadow-emerald-600/30'
                : 'bg-emerald-600 text-white shadow-emerald-600/25'
            }`}
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
          <span
            className={`text-[10px] mt-1 ${
              activeTab === 'workouts' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            Workout
          </span>
        </button>

        {/* Insights */}
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'insights' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'insights' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Insights</span>
        </button>

        {/* Goals */}
        <button
          onClick={() => setActiveTab('goals')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'goals' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Target className={`w-5 h-5 ${activeTab === 'goals' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Goals</span>
        </button>
      </div>
    </nav>
  );
};
