import { DailyActivity, Workout, UserGoals, Achievement } from '../types';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

/**
 * Calculate current and longest streaks based on days reaching the daily step goal
 */
export function calculateStreaks(activities: DailyActivity[], dailyStepGoal: number): StreakInfo {
  if (!activities || activities.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  // Sort activities chronologically by date
  const sorted = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  
  // Find days that met the goal
  const goalMetDates = new Set(
    sorted.filter((a) => a.steps >= dailyStepGoal).map((a) => a.date)
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Compute longest streak by iterating through sorted dates
  let prevDate: Date | null = null;
  for (const act of sorted) {
    const actDate = new Date(act.date);
    if (act.steps >= dailyStepGoal) {
      if (prevDate) {
        const diffDays = Math.round((actDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak += 1;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      prevDate = actDate;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      prevDate = null;
      tempStreak = 0;
    }
  }

  // Compute current streak looking back from today or yesterday
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let checkDate = goalMetDates.has(todayStr) ? today : (goalMetDates.has(yesterdayStr) ? yesterday : null);
  
  if (checkDate) {
    const d = new Date(checkDate);
    while (true) {
      const dStr = d.toISOString().split('T')[0];
      if (goalMetDates.has(dStr)) {
        currentStreak += 1;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const lastActiveDate = sorted.length > 0 ? sorted[sorted.length - 1].date : null;

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate,
  };
}

/**
 * Evaluate achievements dynamically from database records
 */
export function evaluateAchievements(
  activities: DailyActivity[],
  workouts: Workout[],
  goals: UserGoals
): Achievement[] {
  const totalDays = activities.length;
  const daysMetGoal = activities.filter((a) => a.steps >= goals.dailyStepGoal).length;
  const maxSingleDaySteps = activities.reduce((max, a) => Math.max(max, a.steps), 0);
  const totalStepsKm = activities.reduce((sum, a) => sum + a.distanceKm, 0);
  const totalWorkoutKm = workouts.reduce((sum, w) => sum + w.distanceKm, 0);
  const cumulativeDistanceKm = Number((totalStepsKm + totalWorkoutKm).toFixed(1));
  const { currentStreak, longestStreak } = calculateStreaks(activities, goals.dailyStepGoal);
  const maxSingleWorkoutKm = workouts.reduce((max, w) => Math.max(max, w.distanceKm), 0);

  const achievements: Achievement[] = [
    {
      id: 'first-step',
      title: 'First Step',
      description: 'Record your very first day of step tracking.',
      icon: 'Footprints',
      category: 'steps',
      unlocked: totalDays >= 1,
      progress: Math.min(totalDays, 1),
      maxProgress: 1,
    },
    {
      id: 'daily-goal-reached',
      title: 'Daily Goal Crusher',
      description: `Hit your daily target of ${goals.dailyStepGoal.toLocaleString()} steps.`,
      icon: 'Target',
      category: 'steps',
      unlocked: daysMetGoal >= 1,
      progress: Math.min(daysMetGoal, 1),
      maxProgress: 1,
    },
    {
      id: 'first-workout',
      title: 'Active Mover',
      description: 'Complete and record your first walking, jogging, or running workout.',
      icon: 'Dumbbell',
      category: 'workout',
      unlocked: workouts.length >= 1,
      progress: Math.min(workouts.length, 1),
      maxProgress: 1,
    },
    {
      id: 'seven-day-streak',
      title: '7-Day Streak',
      description: 'Hit your daily step goal for 7 consecutive active days.',
      icon: 'Flame',
      category: 'streak',
      unlocked: longestStreak >= 7,
      progress: Math.min(Math.max(currentStreak, longestStreak), 7),
      maxProgress: 7,
    },
    {
      id: 'ten-k-club',
      title: '10,000 Step Milestone',
      description: 'Log 10,000 steps in a single day.',
      icon: 'Trophy',
      category: 'steps',
      unlocked: maxSingleDaySteps >= 10000,
      progress: Math.min(maxSingleDaySteps, 10000),
      maxProgress: 10000,
    },
    {
      id: 'distance-50km',
      title: '50 Kilometer Pioneer',
      description: 'Cover 50 kilometers in combined steps and recorded sessions.',
      icon: 'Milestone',
      category: 'distance',
      unlocked: cumulativeDistanceKm >= 50,
      progress: Math.min(cumulativeDistanceKm, 50),
      maxProgress: 50,
    },
    {
      id: 'workout-warrior',
      title: 'Workout Dedicated',
      description: `Log at least ${goals.weeklyWorkoutGoal} workouts in your fitness log.`,
      icon: 'Medal',
      category: 'workout',
      unlocked: workouts.length >= goals.weeklyWorkoutGoal,
      progress: Math.min(workouts.length, goals.weeklyWorkoutGoal),
      maxProgress: goals.weeklyWorkoutGoal,
    },
    {
      id: 'half-marathon',
      title: 'Half-Marathon Finisher',
      description: 'Record a single workout covering at least 21.1 km.',
      icon: 'Award',
      category: 'distance',
      unlocked: maxSingleWorkoutKm >= 21.1,
      progress: Math.min(maxSingleWorkoutKm, 21.1),
      maxProgress: 21.1,
    },
  ];

  return achievements;
}
