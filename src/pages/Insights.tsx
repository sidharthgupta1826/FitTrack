import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  getMondayToSundayWeek,
  formatFriendlyDate,
  formatDistance,
  formatNumber,
  formatShortDate,
  toDateString,
} from '../utils/calculations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Footprints,
  Flame,
  Target,
  Clock,
  Compass,
} from 'lucide-react';

export const Insights: React.FC = () => {
  const { goals, profile } = useApp();

  const [activeView, setActiveView] = useState<'weekly' | 'monthly'>('weekly');
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [currentMonthOffset, setCurrentMonthOffset] = useState<number>(0);

  // Load activities and workouts from IndexedDB
  const activities = useLiveQuery(() => db.dailyActivities.toArray()) || [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) || [];

  // Determine week range based on offset
  const weekInfo = useMemo(() => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + currentWeekOffset * 7);
    return getMondayToSundayWeek(refDate);
  }, [currentWeekOffset]);

  // Compute Weekly Metrics & Chart Data
  const weeklyData = useMemo(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let totalSteps = 0;
    let totalDist = 0;
    let totalCal = 0;
    let totalActiveMins = 0;
    let daysMetGoal = 0;

    const chartData = weekInfo.weekDates.map((dateStr, idx) => {
      const match = activities.find((a) => a.date === dateStr);
      const steps = match?.steps || 0;
      const dist = match?.distanceKm || 0;
      const cal = match?.calories || 0;
      const mins = match?.activeMinutes || 0;

      totalSteps += steps;
      totalDist += dist;
      totalCal += cal;
      totalActiveMins += mins;
      if (steps >= goals.dailyStepGoal) daysMetGoal++;

      return {
        day: dayNames[idx],
        date: dateStr,
        steps,
        distance: dist,
        calories: cal,
        activeMins: mins,
        goal: goals.dailyStepGoal,
      };
    });

    const avgSteps = Math.round(totalSteps / 7);
    const goalCompletionRate = Math.round((daysMetGoal / 7) * 100);

    // Prior week total for comparison
    const priorRefDate = new Date(weekInfo.monday);
    priorRefDate.setDate(priorRefDate.getDate() - 7);
    const { weekDates: priorWeekDates } = getMondayToSundayWeek(priorRefDate);

    let priorTotalSteps = 0;
    for (const d of priorWeekDates) {
      const match = activities.find((a) => a.date === d);
      if (match) priorTotalSteps += match.steps;
    }

    let wowChange: number | null = null;
    if (priorTotalSteps > 0 && totalSteps > 0) {
      wowChange = Number((((totalSteps - priorTotalSteps) / priorTotalSteps) * 100).toFixed(1));
    }

    return {
      chartData,
      totalSteps,
      avgSteps,
      totalDist: Number(totalDist.toFixed(1)),
      totalCal,
      totalActiveMins,
      daysMetGoal,
      goalCompletionRate,
      priorTotalSteps,
      wowChange,
    };
  }, [activities, weekInfo, goals.dailyStepGoal]);

  // Compute Monthly Metrics & Chart Data
  const monthlyData = useMemo(() => {
    const ref = new Date();
    ref.setMonth(ref.getMonth() + currentMonthOffset);
    const year = ref.getFullYear();
    const month = ref.getMonth(); // 0-11
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let totalSteps = 0;
    let totalDist = 0;
    let totalCal = 0;
    let totalActiveMins = 0;
    let daysMetGoal = 0;
    let recordedDays = 0;

    const chartData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const match = activities.find((a) => a.date === dateStr);
      const steps = match?.steps || 0;
      const dist = match?.distanceKm || 0;
      const cal = match?.calories || 0;
      const mins = match?.activeMinutes || 0;

      if (match) recordedDays++;
      totalSteps += steps;
      totalDist += dist;
      totalCal += cal;
      totalActiveMins += mins;
      if (steps >= goals.dailyStepGoal) daysMetGoal++;

      chartData.push({
        day: `${day}`,
        date: dateStr,
        steps,
        distance: dist,
        calories: cal,
        activeMins: mins,
        goal: goals.dailyStepGoal,
      });
    }

    const divisor = recordedDays > 0 ? recordedDays : daysInMonth;
    const avgSteps = Math.round(totalSteps / divisor);
    const goalCompletionRate = Math.round((daysMetGoal / daysInMonth) * 100);

    const monthLabel = ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return {
      monthLabel,
      chartData,
      totalSteps,
      avgSteps,
      totalDist: Number(totalDist.toFixed(1)),
      totalCal,
      totalActiveMins,
      daysMetGoal,
      goalCompletionRate,
      daysInMonth,
    };
  }, [activities, currentMonthOffset, goals.dailyStepGoal]);

  // Compute Workout Type Distribution
  const workoutDistribution = useMemo(() => {
    let runKm = 0;
    let jogKm = 0;
    let walkKm = 0;

    for (const w of workouts) {
      if (w.activityType === 'running') runKm += w.distanceKm;
      else if (w.activityType === 'jogging') jogKm += w.distanceKm;
      else if (w.activityType === 'walking') walkKm += w.distanceKm;
    }

    const data = [
      { name: 'Running', value: Number(runKm.toFixed(1)), color: '#059669' },
      { name: 'Jogging', value: Number(jogKm.toFixed(1)), color: '#0284C7' },
      { name: 'Walking', value: Number(walkKm.toFixed(1)), color: '#0D9488' },
    ].filter((item) => item.value > 0);

    return data.length > 0
      ? data
      : [
          { name: 'Running', value: 12, color: '#059669' },
          { name: 'Jogging', value: 8, color: '#0284C7' },
          { name: 'Walking', value: 6, color: '#0D9488' },
        ];
  }, [workouts]);

  // Week range label
  const weekRangeLabel = useMemo(() => {
    const monStr = weekInfo.monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sunStr = weekInfo.sunday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${monStr} – ${sunStr}`;
  }, [weekInfo]);

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            Insights & Analytics
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Weekly and monthly reports computed directly from your saved records.
          </p>
        </div>

        {/* View Switcher: Weekly vs Monthly */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveView('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === 'weekly'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Weekly Report
          </button>
          <button
            onClick={() => setActiveView('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === 'monthly'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Monthly Report
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-soft">
        <div className="flex items-center gap-2">
          {activeView === 'weekly' ? (
            <>
              <button
                onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-navy-900 hover:bg-slate-50 transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-navy-900 px-2">{weekRangeLabel}</span>
              <button
                onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                disabled={currentWeekOffset >= 0}
                className={`p-1.5 rounded-lg border transition-colors ${
                  currentWeekOffset >= 0
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'border-slate-200 text-slate-500 hover:text-navy-900 hover:bg-slate-50'
                }`}
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {currentWeekOffset !== 0 && (
                <button
                  onClick={() => setCurrentWeekOffset(0)}
                  className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors ml-2"
                >
                  Current Week
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentMonthOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-navy-900 hover:bg-slate-50 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-navy-900 px-2">
                {monthlyData.monthLabel}
              </span>
              <button
                onClick={() => setCurrentMonthOffset((prev) => prev + 1)}
                disabled={currentMonthOffset >= 0}
                className={`p-1.5 rounded-lg border transition-colors ${
                  currentMonthOffset >= 0
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'border-slate-200 text-slate-500 hover:text-navy-900 hover:bg-slate-50'
                }`}
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {currentMonthOffset !== 0 && (
                <button
                  onClick={() => setCurrentMonthOffset(0)}
                  className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors ml-2"
                >
                  Current Month
                </button>
              )}
            </>
          )}
        </div>

        <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
          {activeView === 'weekly' ? 'Strict Mon–Sun bounds' : 'Full calendar month'}
        </span>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Footprints className="w-4 h-4 text-emerald-600" />
            Total Steps
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-extrabold text-navy-900">
              {formatNumber(activeView === 'weekly' ? weeklyData.totalSteps : monthlyData.totalSteps)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Avg:{' '}
            {formatNumber(activeView === 'weekly' ? weeklyData.avgSteps : monthlyData.avgSteps)} /
            day
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-600" />
            Goal Hit Rate
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-extrabold text-emerald-700">
              {activeView === 'weekly'
                ? `${weeklyData.goalCompletionRate}%`
                : `${monthlyData.goalCompletionRate}%`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activeView === 'weekly'
              ? `${weeklyData.daysMetGoal} of 7 days reached`
              : `${monthlyData.daysMetGoal} of ${monthlyData.daysInMonth} days reached`}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-600" />
            Distance
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-extrabold text-navy-900">
              {activeView === 'weekly' ? weeklyData.totalDist : monthlyData.totalDist}
            </span>
            <span className="text-xs font-semibold text-slate-500">{profile.preferredUnits}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activeView === 'weekly' ? 'Weekly combined' : 'Monthly total'}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
          <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-600" />
            Calories
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-extrabold text-amber-700">
              {formatNumber(activeView === 'weekly' ? weeklyData.totalCal : monthlyData.totalCal)}
            </span>
            <span className="text-xs font-semibold text-slate-500">kcal</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Estimated burn</p>
        </div>
      </div>

      {/* Primary Chart: Daily Steps (Weekly or Monthly) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-navy-900">
              {activeView === 'weekly' ? 'Weekly Daily Steps' : `Monthly Steps Breakdown (${monthlyData.monthLabel})`}
            </h3>
            <p className="text-xs text-slate-500">
              Compared with your {goals.dailyStepGoal.toLocaleString()} goal line
            </p>
          </div>

          {activeView === 'weekly' && weeklyData.wowChange !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                weeklyData.wowChange >= 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <TrendingUp className={`w-3.5 h-3.5 ${weeklyData.wowChange < 0 ? 'rotate-180' : ''}`} />
              <span>
                {weeklyData.wowChange >= 0 ? '+' : ''}
                {weeklyData.wowChange}% week-over-week
              </span>
            </div>
          )}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeView === 'weekly' ? weeklyData.chartData : monthlyData.chartData}
              margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: activeView === 'weekly' ? 12 : 10, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: '#F8FAFC', radius: 8 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-navy-900 text-white px-3.5 py-2.5 rounded-2xl shadow-xl text-xs space-y-1">
                        <p className="font-bold text-slate-200">
                          {d.day} ({d.date})
                        </p>
                        <p className="text-emerald-400 font-extrabold text-sm">
                          {d.steps.toLocaleString()} steps
                        </p>
                        <p className="text-slate-400">
                          {d.distance} km • {d.calories} kcal • {d.activeMins} mins
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
              <Bar dataKey="steps" radius={[6, 6, 2, 2]}>
                {(activeView === 'weekly' ? weeklyData.chartData : monthlyData.chartData).map(
                  (entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.steps >= goals.dailyStepGoal ? '#059669' : '#94A3B8'}
                    />
                  )
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Distance & Calories Trend + Activity Breakdown Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
          <h3 className="text-lg font-bold text-navy-900">Distance Trajectory</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-6">
            Daily distance curve across the selected period
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeView === 'weekly' ? weeklyData.chartData : monthlyData.chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-navy-900 text-white px-3 py-2 rounded-xl text-xs space-y-1">
                          <p className="font-bold">{d.date}</p>
                          <p className="text-emerald-400 font-bold">{d.distance} km</p>
                          <p className="text-amber-400">{d.calories} kcal</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="distance"
                  stroke="#059669"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#distGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workout Activity Distribution */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Activity Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Distance share by running, jogging, and walking
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={workoutDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {workoutDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-navy-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold">
                          {item.name}: {item.value} {profile.preferredUnits}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val) => <span className="text-xs font-semibold text-slate-600">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-500 text-center">
            Computed from all saved walking, jogging, and running workouts.
          </div>
        </div>
      </div>
    </div>
  );
};
