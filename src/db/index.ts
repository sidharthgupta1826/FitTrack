import Dexie, { Table } from 'dexie';
import { DailyActivity, Workout, UserGoals, UserProfile, ActivitySource } from '../types';
import { stepsToKm, stepsToCalories, stepsToActiveMinutes, toDateString } from '../utils/calculations';

export class FitTrackDatabase extends Dexie {
  dailyActivities!: Table<DailyActivity, number>;
  workouts!: Table<Workout, number>;
  goals!: Table<UserGoals, number>;
  profile!: Table<UserProfile, number>;

  constructor() {
    super('FitTrackDB');
    this.version(1).stores({
      dailyActivities: '++id, &date, source, createdAt',
      workouts: '++id, activityType, startTime, createdAt',
      goals: '++id',
      profile: '++id',
    });
  }
}

export const db = new FitTrackDatabase();

export const DEFAULT_GOALS: UserGoals = {
  dailyStepGoal: 8000,
  weeklyDistanceGoalKm: 20,
  weeklyWorkoutGoal: 4,
  dailyActiveMinutesGoal: 45,
};

export const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Alex Runner',
  preferredUnits: 'km',
  themePreference: 'light',
  isAndroidCompanionSynced: false,
  lastSyncTime: undefined,
  syncToken: 'FT-7492A1',
};

/**
 * Initialize defaults and seed realistic demo data if database is empty
 */
export async function initializeDatabase() {
  // Ensure profile exists
  const profileCount = await db.profile.count();
  if (profileCount === 0) {
    await db.profile.add(DEFAULT_PROFILE);
  }

  // Ensure goals exist
  const goalsCount = await db.goals.count();
  if (goalsCount === 0) {
    await db.goals.add(DEFAULT_GOALS);
  }

  // Check if dailyActivities has records
  const activityCount = await db.dailyActivities.count();
  if (activityCount === 0) {
    await seedDemoData();
  }
}

/**
 * Seed realistic activity data for the last 14 days
 * Clearly tagged with source: 'demo'
 */
export async function seedDemoData() {
  const today = new Date();
  const demoDaily: DailyActivity[] = [];
  const demoWorkouts: Workout[] = [];

  // Realistic 14-day history
  const stepPattern = [
    7850, 9240, 8120, 10450, 6890, 11200, 8430, // Last week Mon-Sun
    8650, 9400, 7920, 10830, 8150, 12400, 6200  // This week Mon-Sun
  ];

  const workoutsConfig = [
    { dayOffset: 12, type: 'running' as const, mins: 32, dist: 5.2, cal: 380, notes: 'Morning park run, energetic feel' },
    { dayOffset: 10, type: 'walking' as const, mins: 45, dist: 3.4, cal: 210, notes: 'Evening neighborhood walk' },
    { dayOffset: 9,  type: 'jogging' as const, mins: 28, dist: 3.8, cal: 310, notes: 'Steady tempo jogging' },
    { dayOffset: 6,  type: 'running' as const, mins: 42, dist: 7.1, cal: 520, notes: 'Weekend 7K road workout' },
    { dayOffset: 4,  type: 'jogging' as const, mins: 30, dist: 4.0, cal: 340, notes: 'Sunset recovery jog' },
    { dayOffset: 2,  type: 'walking' as const, mins: 50, dist: 3.9, cal: 240, notes: 'Trail walk with friends' },
    { dayOffset: 1,  type: 'running' as const, mins: 35, dist: 5.5, cal: 410, notes: 'Brisk pace 5.5k' },
  ];

  // Populate 14 days up to today
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = toDateString(d);
    const steps = stepPattern[13 - i] || 8200;
    const distanceKm = stepsToKm(steps);
    const calories = stepsToCalories(steps);
    const activeMinutes = stepsToActiveMinutes(steps);

    demoDaily.push({
      date: dateStr,
      steps,
      source: 'demo',
      distanceKm,
      calories,
      activeMinutes,
      createdAt: d.toISOString(),
      updatedAt: d.toISOString(),
    });
  }

  // Workouts
  for (const w of workoutsConfig) {
    const d = new Date(today);
    d.setDate(today.getDate() - w.dayOffset);
    d.setHours(7, 30, 0, 0);

    const paceMinPerKm = Number((w.mins / w.dist).toFixed(2));
    demoWorkouts.push({
      activityType: w.type,
      startTime: d.toISOString(),
      durationMinutes: w.mins,
      distanceKm: w.dist,
      paceMinPerKm,
      calories: w.cal,
      notes: w.notes,
      createdAt: d.toISOString(),
    });
  }

  await db.transaction('rw', db.dailyActivities, db.workouts, async () => {
    // Delete existing demo records if any
    await db.dailyActivities.where('source').equals('demo').delete();
    await db.dailyActivities.bulkAdd(demoDaily);
    await db.workouts.bulkAdd(demoWorkouts);
  });
}

/**
 * Check if the current database contains demo data
 */
export async function hasDemoData(): Promise<boolean> {
  const count = await db.dailyActivities.where('source').equals('demo').count();
  return count > 0;
}

/**
 * Clear all demo records while keeping user's manual and imported records
 */
export async function clearDemoData(): Promise<number> {
  const count = await db.dailyActivities.where('source').equals('demo').delete();
  return count;
}

/**
 * Reset entire database back to pristine state with defaults
 */
export async function resetAllData(): Promise<void> {
  await db.dailyActivities.clear();
  await db.workouts.clear();
  await db.goals.clear();
  await db.profile.clear();
  await db.goals.add(DEFAULT_GOALS);
  await db.profile.add(DEFAULT_PROFILE);
}

/**
 * Upsert daily step record for a given date
 * Prevents duplicates by keying on date.
 */
export async function upsertDailyActivity(record: {
  date: string;
  steps: number;
  source: ActivitySource;
  distanceKm?: number;
  calories?: number;
  activeMinutes?: number;
}): Promise<number> {
  const existing = await db.dailyActivities.where('date').equals(record.date).first();
  const now = new Date().toISOString();

  const distanceKm = record.distanceKm !== undefined ? record.distanceKm : stepsToKm(record.steps);
  const calories = record.calories !== undefined ? record.calories : stepsToCalories(record.steps);
  const activeMinutes = record.activeMinutes !== undefined ? record.activeMinutes : stepsToActiveMinutes(record.steps);

  if (existing && existing.id) {
    await db.dailyActivities.update(existing.id, {
      steps: record.steps,
      source: record.source,
      distanceKm,
      calories,
      activeMinutes,
      updatedAt: now,
    });
    return existing.id;
  } else {
    const id = await db.dailyActivities.add({
      date: record.date,
      steps: record.steps,
      source: record.source,
      distanceKm,
      calories,
      activeMinutes,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }
}

/**
 * Export all data to JSON
 */
export async function exportAllData(): Promise<string> {
  const dailyActivities = await db.dailyActivities.toArray();
  const workouts = await db.workouts.toArray();
  const goals = await db.goals.toArray();
  const profile = await db.profile.toArray();

  const data = {
    appName: 'FitTrack',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      dailyActivities,
      workouts,
      goals: goals[0] || DEFAULT_GOALS,
      profile: profile[0] || DEFAULT_PROFILE,
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
export async function importData(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data) {
      return { success: false, message: 'Invalid FitTrack backup format.' };
    }

    await db.transaction('rw', db.dailyActivities, db.workouts, db.goals, db.profile, async () => {
      if (Array.isArray(parsed.data.dailyActivities)) {
        await db.dailyActivities.clear();
        await db.dailyActivities.bulkAdd(parsed.data.dailyActivities);
      }
      if (Array.isArray(parsed.data.workouts)) {
        await db.workouts.clear();
        await db.workouts.bulkAdd(parsed.data.workouts);
      }
      if (parsed.data.goals) {
        await db.goals.clear();
        await db.goals.add(parsed.data.goals);
      }
      if (parsed.data.profile) {
        await db.profile.clear();
        await db.profile.add(parsed.data.profile);
      }
    });

    return { success: true, message: 'Data imported successfully!' };
  } catch (err: any) {
    return { success: false, message: `Import error: ${err.message || 'Corrupted file'}` };
  }
}
