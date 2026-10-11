import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, upsertDailyActivity } from '../db';
import {
  getTodayString,
  stepsToKm,
  stepsToCalories,
  formatNumber,
  formatDistance,
} from '../utils/calculations';
import { Modal } from './Modal';
import { Footprints, Flame, Compass, Save, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LogStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export const LogStepsModal: React.FC<LogStepsModalProps> = ({
  isOpen,
  onClose,
  initialDate,
}) => {
  const { goals, profile, showToast, refreshAll } = useApp();

  const [date, setDate] = useState<string>(initialDate || getTodayString());
  const [steps, setSteps] = useState<number>(8000);
  const [existingRecord, setExistingRecord] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    } else {
      setDate(getTodayString());
    }
  }, [initialDate, isOpen]);

  // Check if date already has a record in DB
  useEffect(() => {
    if (!isOpen) return;
    const checkDate = async () => {
      const rec = await db.dailyActivities.where('date').equals(date).first();
      if (rec) {
        setExistingRecord(true);
        setSteps(rec.steps);
      } else {
        setExistingRecord(false);
        setSteps(8000);
      }
    };
    checkDate();
  }, [date, isOpen]);

  const previewDistance = stepsToKm(steps);
  const previewCalories = stepsToCalories(steps);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (steps < 0) {
      showToast('Please enter a valid step count.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await upsertDailyActivity({
        date,
        steps,
        source: 'manual',
      });

      if (steps >= goals.dailyStepGoal) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#059669', '#10B981', '#34D399'],
        });
      }

      showToast(`Saved ${formatNumber(steps)} steps for ${date}!`, 'success');
      await refreshAll();
      onClose();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Daily Steps" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {existingRecord && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <span className="font-bold">Note:</span> An existing record was found for this date. Submitting will update your entry.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-navy-900">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-navy-900">Total Steps Taken</label>
            <span className="text-xs font-semibold text-slate-400">
              Daily Target: {formatNumber(goals.dailyStepGoal)}
            </span>
          </div>
          <input
            type="number"
            min="0"
            max="150000"
            step="1"
            value={steps}
            onChange={(e) => setSteps(Math.max(0, parseInt(e.target.value, 10) || 0))}
            required
            placeholder="e.g. 8450"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-extrabold text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Quick Increment Buttons */}
        <div className="flex items-center gap-2">
          {[2000, 5000, 8000, 10000, 12000].map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => setSteps(preset)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors"
            >
              +{formatNumber(preset)}
            </button>
          ))}
        </div>

        {/* Live Metrics Calculated Preview */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              Est. Distance
            </span>
            <p className="text-base font-extrabold text-navy-900 mt-0.5">
              {formatDistance(previewDistance, profile.preferredUnits)}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Est. Calories
            </span>
            <p className="text-base font-extrabold text-amber-700 mt-0.5">
              {formatNumber(previewCalories)} kcal
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Step Entry'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
