import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { initializeDatabase } from './db';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { LogStepsModal } from './components/LogStepsModal';
import { Dashboard } from './pages/Dashboard';
import { Activity } from './pages/Activity';
import { Workouts } from './pages/Workouts';
import { Insights } from './pages/Insights';
import { Goals } from './pages/Goals';
import { Profile } from './pages/Profile';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalDate, setLogModalDate] = useState<string | undefined>(undefined);

  const handleOpenLogModal = (date?: string) => {
    setLogModalDate(date);
    setLogModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#0F172A]">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Dynamic Page Views */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
          {activeTab === 'dashboard' && (
            <Dashboard
              onOpenLogModal={() => handleOpenLogModal()}
              onOpenSyncModal={() => setActiveTab('activity')}
            />
          )}

          {activeTab === 'activity' && (
            <Activity onOpenLogModal={(date) => handleOpenLogModal(date)} />
          )}

          {activeTab === 'workouts' && <Workouts />}

          {activeTab === 'insights' && <Insights />}

          {activeTab === 'goals' && <Goals />}

          {activeTab === 'profile' && <Profile />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Notifications Toast */}
      <Toast />

      {/* Step Entry Modal */}
      <LogStepsModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        initialDate={logModalDate}
      />
    </div>
  );
};

export function App() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase().then(() => {
      setIsDbReady(true);
    });
  }, []);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 animate-pulse">
          <svg className="w-7 h-7 text-white" viewBox="0 0 100 100" fill="none">
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
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Initializing FitTrack...
        </p>
      </div>
    );
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
