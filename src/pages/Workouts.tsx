import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ActivityType, Workout } from '../types';
import {
  calculatePace,
  formatPace,
  formatDistance,
  formatDuration,
  formatNumber,
  estimateWorkoutCalories,
  formatShortDate,
} from '../utils/calculations';
import { useGpsTracker } from '../hooks/useGpsTracker';
import { WorkoutMap } from '../components/WorkoutMap';
import { Modal } from '../components/Modal';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Footprints,
  Flame,
  Clock,
  Compass,
  PlusCircle,
  Activity as ActivityIcon,
  Filter,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
} from 'lucide-react';

export const Workouts: React.FC = () => {
  const { profile, showToast, refreshAll } = useApp();

  const [activeTab, setActiveTab] = useState<'live' | 'manual'>('live');
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
  const [selectedRouteCoords, setSelectedRouteCoords] = useState<[number, number][] | null>(null);
  const [liveType, setLiveType] = useState<ActivityType>('running');

  // Manual Form State
  const [manualType, setManualType] = useState<ActivityType>('running');
  const [manualDate, setManualDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [manualDuration, setManualDuration] = useState<number>(30);
  const [manualDistance, setManualDistance] = useState<number>(4.5);
  const [manualNotes, setManualNotes] = useState<string>('');
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false);

  // Completed workout summary modal after live session
  const [summaryWorkout, setSummaryWorkout] = useState<Workout | null>(null);

  // Live GPS Tracker Hook
  const {
    state: gpsState,
    startTracking,
    startSimulatedTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking,
  } = useGpsTracker();

  // Load all workouts from database
  const workouts = useLiveQuery(() => db.workouts.toArray()) || [];

  // Filtered workouts
  const filteredWorkouts = [...workouts]
    .filter((w) => filterType === 'all' || w.activityType === filterType)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Format stopwatch seconds MM:SS or HH:MM:SS
  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Handle Finish Live Workout
  const handleFinishLiveWorkout = async () => {
    stopTracking();

    const durationMins = Number((gpsState.elapsedSeconds / 60).toFixed(1));
    const distanceKm = gpsState.distanceKm;
    const paceMinPerKm = calculatePace(durationMins, distanceKm);
    const calories = estimateWorkoutCalories(gpsState.activityType, durationMins, distanceKm);

    const workoutRecord: Workout = {
      activityType: gpsState.activityType,
      startTime: new Date(Date.now() - gpsState.elapsedSeconds * 1000).toISOString(),
      durationMinutes: Math.max(durationMins, 1),
      distanceKm: Math.max(distanceKm, 0.05),
      paceMinPerKm: isFinite(paceMinPerKm) ? paceMinPerKm : 0,
      calories,
      routeCoordinates: gpsState.coordinates.length > 0 ? gpsState.coordinates : undefined,
      notes: 'Recorded via FitTrack Live GPS Tracker',
      createdAt: new Date().toISOString(),
    };

    const id = await db.workouts.add(workoutRecord);
    workoutRecord.id = id;

    setSummaryWorkout(workoutRecord);
    showToast(`${gpsState.activityType} workout saved successfully!`, 'success');
    await refreshAll();
  };

  // Handle Save Manual Workout
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualDuration <= 0) {
      showToast('Please enter a duration greater than 0 minutes.', 'error');
      return;
    }
    if (manualDistance <= 0) {
      showToast('Please enter a distance greater than 0.', 'error');
      return;
    }

    setIsSavingManual(true);
    try {
      // If user inputs miles, convert to km for consistent storage
      const distanceInKm =
        profile.preferredUnits === 'miles' ? manualDistance / 0.621371 : manualDistance;

      const paceMinPerKm = calculatePace(manualDuration, distanceInKm);
      const calories = estimateWorkoutCalories(manualType, manualDuration, distanceInKm);

      const workoutRecord: Workout = {
        activityType: manualType,
        startTime: new Date(manualDate).toISOString(),
        durationMinutes: manualDuration,
        distanceKm: Number(distanceInKm.toFixed(2)),
        paceMinPerKm,
        calories,
        notes: manualNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const id = await db.workouts.add(workoutRecord);
      workoutRecord.id = id;

      setSummaryWorkout(workoutRecord);
      showToast('Workout logged successfully!', 'success');
      setManualNotes('');
      await refreshAll();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSavingManual(false);
    }
  };

  // Delete workout
  const handleDeleteWorkout = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this workout record?')) {
      await db.workouts.delete(id);
      showToast('Workout deleted.');
      await refreshAll();
    }
  };

  // Calculated manual pace for live feedback in form
  const computedManualPace = calculatePace(
    manualDuration,
    profile.preferredUnits === 'miles' ? manualDistance / 0.621371 : manualDistance
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            Workout Tracker
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Track live walking, jogging, or running sessions with GPS, or log manual workouts.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Live GPS Tracker
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            Log Completed
          </button>
        </div>
      </div>

      {/* Mode A: Live GPS Workout Tracker */}
      {activeTab === 'live' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6">
          {/* Activity Type Selector */}
          {gpsState.status === 'idle' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Choose Activity Type
              </span>
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                {(['walking', 'jogging', 'running'] as ActivityType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLiveType(type)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                      liveType === type
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Metrics Display */}
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700 capitalize mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{gpsState.activityType} Workout</span>
              {gpsState.currentAccuracyMeters !== null && (
                <span className="text-[10px] text-slate-400 font-normal">
                  (GPS ±{gpsState.currentAccuracyMeters}m)
                </span>
              )}
            </div>

            {/* Stopwatch Timer */}
            <div className="text-5xl sm:text-7xl font-extrabold text-navy-900 font-mono tracking-tight my-2">
              {formatStopwatch(gpsState.elapsedSeconds)}
            </div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Elapsed Time
            </p>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-6">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Distance</span>
                <p className="text-2xl font-bold text-navy-900 mt-1">
                  {formatDistance(gpsState.distanceKm, profile.preferredUnits).replace(/ [a-z]+$/, '')}
                </p>
                <span className="text-xs text-slate-400 font-medium">{profile.preferredUnits}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Avg Pace</span>
                <p className="text-xl font-bold text-navy-900 mt-1">
                  {formatPace(gpsState.currentPace, profile.preferredUnits).replace(/ \/[a-z]+$/, '')}
                </p>
                <span className="text-xs text-slate-400 font-medium">/{profile.preferredUnits}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Calories</span>
                <p className="text-2xl font-bold text-navy-900 mt-1">
                  {formatNumber(gpsState.estimatedCalories)}
                </p>
                <span className="text-xs text-slate-400 font-medium">kcal (est.)</span>
              </div>
            </div>

            {/* GPS Error or Permission Warning */}
            {gpsState.errorMessage && (
              <div className="max-w-md mx-auto mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{gpsState.errorMessage}</span>
              </div>
            )}
          </div>

          {/* Live GPS Map */}
          <div className="mt-4">
            <WorkoutMap coordinates={gpsState.coordinates} isLive={gpsState.status === 'tracking'} />
          </div>

          {/* Live Tracker Action Controls */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100">
            {gpsState.status === 'idle' ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => startTracking(liveType)}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all capitalize"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Live {liveType}</span>
                </button>
                <button
                  onClick={() => startSimulatedTracking(liveType)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-all shadow-xs"
                  title="Simulate GPS movement along a park trail for indoor testing"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Simulate Route (Test Mode)</span>
                </button>
              </div>
            ) : gpsState.status === 'tracking' ? (
              <>
                <button
                  onClick={pauseTracking}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={handleFinishLiveWorkout}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Finish & Save</span>
                </button>
              </>
            ) : (
              // Paused state
              <>
                <button
                  onClick={resumeTracking}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </button>
                <button
                  onClick={handleFinishLiveWorkout}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-navy-900 text-white font-bold text-xs hover:bg-navy-950 shadow-md active:scale-95 transition-all"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Finish</span>
                </button>
                <button
                  onClick={resetTracking}
                  className="p-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  title="Discard workout"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mode B: Manual Workout Recording Form */}
      {activeTab === 'manual' && (
        <form
          onSubmit={handleSaveManual}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6"
        >
          <div>
            <h3 className="text-lg font-bold text-navy-900">Record Completed Workout</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a workout session you finished outdoors, at the track, or on a treadmill.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Activity Type Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy-900">Activity Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['walking', 'jogging', 'running'] as ActivityType[]).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setManualType(type)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                      manualType === type
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy-900">Start Date & Time</label>
              <input
                type="datetime-local"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Duration in Minutes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy-900">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                max="600"
                step="1"
                value={manualDuration}
                onChange={(e) => setManualDuration(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Distance */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy-900">
                Distance ({profile.preferredUnits})
              </label>
              <input
                type="number"
                min="0.1"
                max="200"
                step="0.01"
                value={manualDistance}
                onChange={(e) => setManualDistance(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Auto-Calculated Metrics Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Calculated Pace
              </span>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                {formatPace(computedManualPace, profile.preferredUnits)}
              </p>
              <p className="text-[10px] text-slate-400">Pace = Duration / Distance</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Estimated Calories
              </span>
              <p className="text-base font-bold text-amber-700 mt-0.5">
                {formatNumber(
                  estimateWorkoutCalories(
                    manualType,
                    manualDuration,
                    profile.preferredUnits === 'miles' ? manualDistance / 0.621371 : manualDistance
                  )
                )}{' '}
                kcal
              </p>
              <p className="text-[10px] text-slate-400">Approximate MET estimate</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Session Length
              </span>
              <p className="text-base font-bold text-navy-900 mt-0.5">
                {formatDuration(manualDuration)}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-navy-900">Workout Notes (Optional)</label>
            <textarea
              rows={2}
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="e.g., Felt strong, cool breezy weather, hills on final kilometer"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingManual}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              {isSavingManual ? 'Saving Workout...' : 'Save Workout Session'}
            </button>
          </div>
        </form>
      )}

      {/* Workout History Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Workout History</h3>
            <p className="text-xs text-slate-500">
              {filteredWorkouts.length} total sessions recorded
            </p>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'running', 'jogging', 'walking'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                  filterType === t
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {filteredWorkouts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <ActivityIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No workout records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Start a live GPS workout above or log a completed session.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWorkouts.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-emerald-200 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`p-3 rounded-2xl shrink-0 ${
                      w.activityType === 'running'
                        ? 'bg-emerald-100 text-emerald-700'
                        : w.activityType === 'jogging'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    <ActivityIcon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-navy-900 capitalize">
                        {w.activityType}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(w.startTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(w.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium mt-1">
                      <span>{formatDuration(w.durationMinutes)}</span>
                      <span>•</span>
                      <span className="font-bold text-navy-900">
                        {formatDistance(w.distanceKm, profile.preferredUnits)}
                      </span>
                      <span>•</span>
                      <span>{formatPace(w.paceMinPerKm, profile.preferredUnits)}</span>
                      <span>•</span>
                      <span className="text-amber-700 font-semibold">{w.calories} kcal</span>
                    </div>

                    {w.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic font-normal">
                        "{w.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {w.routeCoordinates && w.routeCoordinates.length > 0 && (
                    <button
                      onClick={() => setSelectedRouteCoords(w.routeCoordinates || null)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Route Map</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteWorkout(w.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                    title="Delete workout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workout Completed Summary Modal */}
      {summaryWorkout && (
        <Modal
          isOpen={true}
          onClose={() => setSummaryWorkout(null)}
          title="Workout Summary 🎉"
          maxWidth="md"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-navy-900 capitalize">
                Great job! {summaryWorkout.activityType} Session Saved
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Your workout metrics have been logged to your persistent fitness history.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Distance</span>
                <p className="text-xl font-extrabold text-navy-900 mt-1">
                  {formatDistance(summaryWorkout.distanceKm, profile.preferredUnits)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Duration</span>
                <p className="text-xl font-extrabold text-navy-900 mt-1">
                  {formatDuration(summaryWorkout.durationMinutes)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Average Pace</span>
                <p className="text-lg font-extrabold text-emerald-700 mt-1">
                  {formatPace(summaryWorkout.paceMinPerKm, profile.preferredUnits)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Calories Burned</span>
                <p className="text-lg font-extrabold text-amber-700 mt-1">
                  {summaryWorkout.calories} kcal
                </p>
              </div>
            </div>

            {summaryWorkout.routeCoordinates && summaryWorkout.routeCoordinates.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <WorkoutMap coordinates={summaryWorkout.routeCoordinates} height="200px" />
              </div>
            )}

            <button
              onClick={() => setSummaryWorkout(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* Route Coordinates Map Modal */}
      {selectedRouteCoords && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRouteCoords(null)}
          title="Recorded GPS Route"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <WorkoutMap coordinates={selectedRouteCoords} height="360px" />
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedRouteCoords(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                Close Map
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
