import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { calculateStreaks, evaluateAchievements } from '../utils/achievements';
import { formatNumber } from '../utils/calculations';
import {
  Flame,
  Target,
  Trophy,
  Award,
  Medal,
  Footprints,
  Dumbbell,
  Milestone,
  CheckCircle2,
  Lock,
  Save,
  Sparkles,
} from 'lucide-react';

export const Goals: React.FC = () => {
  const { goals, updateGoals, profile, showToast } = useApp();

  // Load activities and workouts
  const activities = useLiveQuery(() => db.dailyActivities.toArray()) || [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) || [];

  // Evaluate dynamic achievements and streaks from actual database records
  const streakInfo = calculateStreaks(activities, goals.dailyStepGoal);
  const achievements = evaluateAchievements(activities, workouts, goals);

  // Form State for goal customization
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(goals.dailyStepGoal);
  const [weeklyDistanceGoalKm, setWeeklyDistanceGoalKm] = useState<number>(
    goals.weeklyDistanceGoalKm
  );
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState<number>(goals.weeklyWorkoutGoal);
  const [dailyActiveMinutesGoal, setDailyActiveMinutesGoal] = useState<number>(
    goals.dailyActiveMinutesGoal
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateGoals({
      dailyStepGoal,
      weeklyDistanceGoalKm,
      weeklyWorkoutGoal,
      dailyActiveMinutesGoal,
    });
    setIsSaving(false);
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Icon mapper helper
  const renderIcon = (iconName: string, unlocked: boolean) => {
    const className = `w-6 h-6 ${unlocked ? 'text-emerald-600' : 'text-slate-400'}`;
    switch (iconName) {
      case 'Footprints':
        return <Footprints className={className} />;
      case 'Target':
        return <Target className={className} />;
      case 'Dumbbell':
        return <Dumbbell className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Trophy':
        return <Trophy className={className} />;
      case 'Milestone':
        return <Milestone className={className} />;
      case 'Medal':
        return <Medal className={className} />;
      case 'Award':
        return <Award className={className} />;
      default:
        return <Trophy className={className} />;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
          Goals & Achievements
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Set customized fitness targets and unlock milestones calculated from your actual workout history.
        </p>
      </div>

      {/* Streak Encouragement Card */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl p-6 sm:p-8 shadow-card relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Flame className="w-9 h-9 text-amber-100 fill-amber-100 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
                Active Activity Streak
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-0.5">
                {streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? 'Day' : 'Days'}
              </h2>
              <p className="text-xs text-amber-100 font-medium mt-1">
                {streakInfo.currentStreak > 0
                  ? `Every step counts! You've reached your daily step goal ${streakInfo.currentStreak} consecutive days.`
                  : 'Hit your daily step goal today to spark your activity streak!'}
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl text-center self-start sm:self-auto border border-white/20">
            <span className="text-[11px] font-semibold text-amber-100 uppercase">
              Personal Best
            </span>
            <p className="text-2xl font-extrabold mt-0.5">
              {streakInfo.longestStreak} Days
            </p>
          </div>
        </div>
      </div>

      {/* Customize Goals Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Personal Fitness Targets</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust your daily and weekly goals to match your personal routine
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGoals} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Daily Step Goal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-emerald-600" />
                  Daily Step Goal
                </label>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatNumber(dailyStepGoal)} steps
                </span>
              </div>
              <input
                type="range"
                min="3000"
                max="25000"
                step="500"
                value={dailyStepGoal}
                onChange={(e) => setDailyStepGoal(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400">
                Recommended for beginners: 6,000–8,000 • Active runners: 10,000+
              </p>
            </div>

            {/* Weekly Distance Goal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Weekly Distance Target
                </label>
                <span className="text-sm font-extrabold text-emerald-700">
                  {weeklyDistanceGoalKm} {profile.preferredUnits}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={weeklyDistanceGoalKm}
                onChange={(e) => setWeeklyDistanceGoalKm(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400">
                Combined distance from walks, jogs, and runs throughout the week.
              </p>
            </div>

            {/* Weekly Workout Goal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-emerald-600" />
                  Weekly Workout Sessions
                </label>
                <span className="text-sm font-extrabold text-emerald-700">
                  {weeklyWorkoutGoal} sessions/week
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={weeklyWorkoutGoal}
                onChange={(e) => setWeeklyWorkoutGoal(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400">
                Number of recorded walks, jogs, or runs per week.
              </p>
            </div>

            {/* Daily Active Minutes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Daily Active Minutes
                </label>
                <span className="text-sm font-extrabold text-emerald-700">
                  {dailyActiveMinutesGoal} minutes
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="150"
                step="5"
                value={dailyActiveMinutesGoal}
                onChange={(e) => setDailyActiveMinutesGoal(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400">
                Brisk walking or workout minutes per day.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Update Fitness Goals'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Achievements Badges Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-navy-900">Milestone Achievements</h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                {unlockedCount} / {achievements.length} Unlocked
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Badges are calculated dynamically from your actual activity records.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((ach) => {
            const percent = Math.min(Math.round((ach.progress / ach.maxProgress) * 100), 100);

            return (
              <div
                key={ach.id}
                className={`p-5 rounded-2xl border transition-all ${
                  ach.unlocked
                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
                    : 'bg-slate-50/60 border-slate-100 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3 rounded-2xl ${
                      ach.unlocked ? 'bg-emerald-100' : 'bg-slate-200/70'
                    }`}
                  >
                    {renderIcon(ach.icon, ach.unlocked)}
                  </div>
                  {ach.unlocked ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      In Progress
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h4 className="font-extrabold text-sm text-navy-900">{ach.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{ach.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                    <span>Progress</span>
                    <span className={ach.unlocked ? 'text-emerald-700' : 'text-slate-600'}>
                      {ach.progress} / {ach.maxProgress} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        ach.unlocked ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
