import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserGoals, UserProfile, SyncStatus } from '../types';
import { db, DEFAULT_GOALS, DEFAULT_PROFILE, hasDemoData, clearDemoData } from '../db';
import { getStoredSyncStatus } from '../services/healthConnect';

export type TabType = 'dashboard' | 'activity' | 'workouts' | 'insights' | 'goals' | 'profile';

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  goals: UserGoals;
  profile: UserProfile;
  syncStatus: SyncStatus;
  hasDemo: boolean;
  refreshHasDemo: () => Promise<void>;
  handleClearDemo: () => Promise<void>;
  updateGoals: (newGoals: Partial<UserGoals>) => Promise<void>;
  updateProfile: (newProfile: Partial<UserProfile>) => Promise<void>;
  refreshAll: () => Promise<void>;
  toast: { message: string; type?: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  pwaPrompt: any;
  installPwa: () => void;
  canInstallPwa: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<TabType>('dashboard');
  const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getStoredSyncStatus());
  const [hasDemo, setHasDemo] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);

  // Sync hash with active tab
  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      if (['dashboard', 'activity', 'workouts', 'insights', 'goals', 'profile'].includes(hash)) {
        setActiveTabState(hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPwa = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('FitTrack installed to your home screen!', 'success');
      setPwaPrompt(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadData = async () => {
    try {
      const g = await db.goals.toCollection().first();
      if (g) setGoals(g);

      const p = await db.profile.toCollection().first();
      if (p) setProfile(p);

      const demoActive = await hasDemoData();
      setHasDemo(demoActive);

      setSyncStatus(getStoredSyncStatus());
    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshHasDemo = async () => {
    const demoActive = await hasDemoData();
    setHasDemo(demoActive);
  };

  const handleClearDemo = async () => {
    await clearDemoData();
    await refreshHasDemo();
    showToast('Demo preview records removed. Ready for your activity data!', 'info');
  };

  const updateGoals = async (newGoals: Partial<UserGoals>) => {
    const updated = { ...goals, ...newGoals };
    const current = await db.goals.toCollection().first();
    if (current && current.id) {
      await db.goals.update(current.id, updated);
    } else {
      await db.goals.add(updated);
    }
    setGoals(updated);
    showToast('Fitness goals updated successfully!');
  };

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    const updated = { ...profile, ...newProfile };
    const current = await db.profile.toCollection().first();
    if (current && current.id) {
      await db.profile.update(current.id, updated);
    } else {
      await db.profile.add(updated);
    }
    setProfile(updated);
    showToast('Profile preferences saved!');
  };

  const refreshAll = async () => {
    await loadData();
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        goals,
        profile,
        syncStatus,
        hasDemo,
        refreshHasDemo,
        handleClearDemo,
        updateGoals,
        updateProfile,
        refreshAll,
        toast,
        showToast,
        pwaPrompt,
        installPwa,
        canInstallPwa: !!pwaPrompt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
