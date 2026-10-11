import React from 'react';
import { Info, Trash2, CheckCircle2 } from 'lucide-react';

interface DemoDataBannerProps {
  onClearDemo: () => void;
  isClearing?: boolean;
}

export const DemoDataBanner: React.FC<DemoDataBannerProps> = ({ onClearDemo, isClearing }) => {
  return (
    <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5 sm:mt-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Demo Preview Mode
            </span>
            <span className="text-xs text-amber-700 font-medium">Sample Fitness Data Active</span>
          </div>
          <p className="text-xs text-amber-800 mt-1">
            Historical steps and workouts shown are realistic preview samples so you can explore charts and features.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          onClick={onClearDemo}
          disabled={isClearing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 active:scale-95 transition-all shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5 text-amber-700" />
          {isClearing ? 'Clearing...' : 'Clear Demo Data'}
        </button>
      </div>
    </div>
  );
};
