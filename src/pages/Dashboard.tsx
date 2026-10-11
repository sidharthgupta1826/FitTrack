import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  getTodayString,
  getMondayToSundayWeek,
  formatDistance,
  formatNumber,
  toDateString,
} from '../utils/calculations';
import { ProgressRing } from '../components/ProgressRing';
import { StatCard } from '../components/StatCard';
import { DemoDataBanner } from '../components/DemoDataBanner';
import {
  Footprints,
  Flame,
  Clock,
  Compass,
  TrendingUp,
  PlusCircle,
  Play,
  Smartphone,
  ChevronRight,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import confetti from 'canvas-confetti';

interface DashboardProps {
  onOpenLogModal: () => void;
  onOpenSyncModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenLogModal, onOpenSyncModal }) => {
  const { profile, goals, setActiveTab, hasDemo, handleClearDemo } = useApp();

  const todayStr = getTodayString();
  const allActivities = useLiveQuery(() => db.dailyActivities.toArray()) || [];
  const allWorkouts = useLiveQuery(() => db.workouts.toArray()) || [];

  // Today's specific activity
  const todayRecord = useMemo(() => {
    return allActivities.find((a) => a.date === todayStr);
  }, [allActivities, todayStr]);

  const todaySteps = todayRecord?.steps || 0;
  const todayDistance = todayRecord?.distanceKm || 0;
  const todayCalories = todayRecord?.calories || 0;
  const todayActiveMinutes = todayRecord?.activeMinutes || 0;
  const goalPercentage = Math.round((todaySteps / goals.dailyStepGoal) * 100);

  // Trigger celebratory confetti if user hit 100% of goal today
  const handleRingClick = () => {
    if (todaySteps >= goals.dailyStepGoal) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#34D399', '#6EE7B7'],
      });
    }
  };

  // Weekly Overview (Monday to Sunday)
  const currentWeek = useMemo(() => {
    const { weekDates } = getMondayToSundayWeek(new Date());
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    let totalSteps = 0;
    let totalDist = 0;
    let totalMins = 0;
    let maxSteps = -1;
    let mostActiveDayName = '';

    const chartData = weekDates.map((dateStr, idx) => {
      const match = allActivities.find((a) => a.date === dateStr);
      const steps = match?.steps || 0;
      const isToday = dateStr === todayStr;

      totalSteps += steps;
      totalDist += match?.distanceKm || 0;
      totalMins += match?.activeMinutes || 0;

      if (steps > maxSteps && steps > 0) {
        maxSteps = steps;
        mostActiveDayName = dayNames[idx];
      }

      return {
        day: dayNames[idx],
        date: dateStr,
        steps,
        isToday,
        goal: goals.dailyStepGoal,
      };
    });

    const avgSteps = Math.round(totalSteps / 7);

    // Calculate previous week's total steps for comparison
    const lastWeekMonday = new Date();
    lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);
    const { weekDates: prevWeekDates } = getMondayToSundayWeek(lastWeekMonday);

    let prevTotalSteps = 0;
    for (const d of prevWeekDates) {
      const rec = allActivities.find((a) => a.date === d);
      if (rec) prevTotalSteps += rec.steps;
    }

    let changePercent: number | null = null;
    if (prevTotalSteps > 0 && totalSteps > 0) {
      changePercent = Number((((totalSteps - prevTotalSteps) / prevTotalSteps) * 100).toFixed(1));
    }

    return {
      chartData,
      totalSteps,
      avgSteps,
      totalDist,
      totalMins,
      mostActiveDay: mostActiveDayName || 'None',
      prevTotalSteps,
      changePercent,
    };
  }, [allActivities, todayStr, goals.dailyStepGoal]);

  // Activity Summary (Running, Jogging, Walking distances)
  const activitySummary = useMemo(() => {
    let runDist = 0;
    let jogDist = 0;
    let walkDist = 0;

    for (const w of allWorkouts) {
      if (w.activityType === 'running') runDist += w.distanceKm;
      else if (w.activityType === 'jogging') jogDist += w.distanceKm;
      else if (w.activityType === 'walking') walkDist += w.distanceKm;
    }

    return {
      runDist: Number(runDist.toFixed(1)),
      jogDist: Number(jogDist.toFixed(1)),
      walkDist: Number(walkDist.toFixed(1)),
      totalWorkouts: allWorkouts.length,
    };
  }, [allWorkouts]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Demo Banner */}
      {hasDemo && <DemoDataBanner onClearDemo={handleClearDemo} />}

      {/* Greeting and Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            {greeting}, <span className="text-emerald-700">{profile.displayName}</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLogModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-navy-900 hover:bg-slate-50 hover:border-emerald-300 shadow-soft transition-all"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Log Steps</span>
          </button>
          <button
            onClick={() => setActiveTab('workouts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Workout</span>
          </button>
        </div>
      </div>

      {/* Primary Section: Daily Activity Card & Ring */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Today's Activity
            </span>
            <h2 className="text-xl font-bold text-navy-900 mt-2">Daily Movement</h2>
          </div>
          {todayRecord?.source && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                todayRecord.source === 'demo'
                  ? 'bg-amber-100 text-amber-800'
                  : todayRecord.source === 'imported'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {todayRecord.source} Entry
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Circular Progress Ring */}
          <div
            onClick={handleRingClick}
            className="lg:col-span-5 flex flex-col items-center justify-center cursor-pointer group"
          >
            <ProgressRing
              current={todaySteps}
              goal={goals.dailyStepGoal}
              size={230}
              strokeWidth={18}
              label="Today's Steps"
              sublabel={goalPercentage >= 100 ? 'Goal Reached! 🌟' : `${goalPercentage}% completed`}
            />
            <p className="text-xs text-slate-400 mt-3 font-medium text-center">
              Target: {formatNumber(goals.dailyStepGoal)} steps / day
            </p>
          </div>

          {/* Metric Tiles for Today */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Footprints className="w-5 h-5 text-emerald-600" />}
              label="Distance"
              value={formatDistance(todayDistance, profile.preferredUnits).replace(/ [a-z]+$/, '')}
              unit={profile.preferredUnits}
              subtext="Walking & running"
              color="emerald"
            />
            <StatCard
              icon={<Flame className="w-5 h-5 text-amber-600" />}
              label="Calories"
              value={formatNumber(todayCalories)}
              unit="kcal"
              subtext="Approx. burned"
              color="amber"
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-sky-600" />}
              label="Active Time"
              value={todayActiveMinutes}
              unit="mins"
              subtext={`Goal: ${goals.dailyActiveMinutesGoal}m`}
              color="blue"
            />
          </div>
        </div>
      </div>

      {/* Activity Summary (Walking, Jogging, Running Breakdown) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Workout Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Accumulated distance by activity type across {activitySummary.totalWorkouts} sessions
            </p>
          </div>
          <button
            onClick={() => setActiveTab('workouts')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Running</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-navy-900">{activitySummary.runDist}</span>
              <span className="text-xs font-semibold text-slate-500">{profile.preferredUnits}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    (activitySummary.runDist / (goals.weeklyDistanceGoalKm || 20)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jogging</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-navy-900">{activitySummary.jogDist}</span>
              <span className="text-xs font-semibold text-slate-500">{profile.preferredUnits}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full"
                style={{
                  width: `${Math.min((activitySummary.jogDist / 15) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Walking</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-navy-900">{activitySummary.walkDist}</span>
              <span className="text-xs font-semibold text-slate-500">{profile.preferredUnits}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full"
                style={{
                  width: `${Math.min((activitySummary.walkDist / 20) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-navy-900">{activitySummary.totalWorkouts}</span>
              <span className="text-xs font-semibold text-slate-500">logged</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5">
              Goal: {goals.weeklyWorkoutGoal} sessions/wk
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Overview Section: Recharts Bar Chart & Metrics */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-navy-900">Weekly Overview</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Mon – Sun
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily steps compared against your {goals.dailyStepGoal.toLocaleString()} goal line
            </p>
          </div>

          {currentWeek.changePercent !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto ${
                currentWeek.changePercent >= 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <TrendingUp
                className={`w-3.5 h-3.5 ${currentWeek.changePercent < 0 ? 'rotate-180' : ''}`}
              />
              <span>
                {currentWeek.changePercent >= 0 ? '+' : ''}
                {currentWeek.changePercent}% vs last week
              </span>
            </div>
          )}
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentWeek.chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: '#F1F5F9', radius: 8 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-navy-900 text-white px-3.5 py-2.5 rounded-2xl shadow-xl text-xs space-y-1">
                        <p className="font-bold text-slate-200">
                          {data.day} ({data.date})
                        </p>
                        <p className="text-emerald-400 font-extrabold text-sm">
                          {data.steps.toLocaleString()} steps
                        </p>
                        <p className="text-slate-400">
                          {data.steps >= data.goal
                            ? 'Goal Achieved! ✓'
                            : `${data.goal - data.steps} steps to target`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={goals.dailyStepGoal}
                stroke="#059669"
                strokeDasharray="4 4"
                label={{
                  value: 'Goal',
                  fill: '#059669',
                  fontSize: 10,
                  position: 'right',
                }}
              />
              <Bar dataKey="steps" radius={[8, 8, 4, 4]}>
                {currentWeek.chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isToday
                        ? '#059669' // Deep emerald for today
                        : entry.steps >= goals.dailyStepGoal
                        ? '#10B981' // Bright emerald for goal reached
                        : '#CBD5E1' // Subtle slate
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Stats Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-slate-100 text-center">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Steps</p>
            <p className="text-lg font-bold text-navy-900 mt-0.5">
              {formatNumber(currentWeek.totalSteps)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Daily Average</p>
            <p className="text-lg font-bold text-navy-900 mt-0.5">
              {formatNumber(currentWeek.avgSteps)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Distance</p>
            <p className="text-lg font-bold text-navy-900 mt-0.5">
              {formatDistance(currentWeek.totalDist, profile.preferredUnits)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Active Time</p>
            <p className="text-lg font-bold text-navy-900 mt-0.5">{currentWeek.totalMins}m</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Best Day</p>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">
              {currentWeek.mostActiveDay}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
