export type ActivityType = 'walking' | 'jogging' | 'running';

export type ActivitySource = 'manual' | 'imported' | 'demo';

export interface DailyActivity {
  id?: number;
  date: string; // YYYY-MM-DD
  steps: number;
  source: ActivitySource;
  distanceKm: number;
  calories: number;
  activeMinutes: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Workout {
  id?: number;
  activityType: ActivityType;
  startTime: string; // ISO string
  durationMinutes: number;
  distanceKm: number;
  paceMinPerKm: number; // min per km
  calories: number;
  notes?: string;
  routeCoordinates?: [number, number][]; // [lat, lng] array
  createdAt: string; // ISO string
}

export interface UserGoals {
  id?: number;
  dailyStepGoal: number; // default: 8000
  weeklyDistanceGoalKm: number; // default: 15
  weeklyWorkoutGoal: number; // default: 4
  dailyActiveMinutesGoal: number; // default: 45
}

export interface UserProfile {
  id?: number;
  displayName: string;
  preferredUnits: 'km' | 'miles';
  themePreference: 'light' | 'dark' | 'system';
  isAndroidCompanionSynced: boolean;
  lastSyncTime?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'steps' | 'streak' | 'workout' | 'distance';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSyncTime?: string;
  provider: 'health_connect' | 'samsung_health' | 'manual' | 'file_import';
  statusMessage: string;
}

export interface DayStepSummary {
  dayName: string; // 'Mon', 'Tue', etc.
  date: string; // YYYY-MM-DD
  steps: number;
  goal: number;
  distanceKm: number;
  calories: number;
  activeMinutes: number;
  isToday: boolean;
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  days: DayStepSummary[];
  totalSteps: number;
  avgDailySteps: number;
  totalDistanceKm: number;
  totalActiveMinutes: number;
  totalCalories: number;
  mostActiveDay: { day: string; steps: number } | null;
  previousWeekTotalSteps: number;
  weekOverWeekStepChangePercent: number | null;
}
