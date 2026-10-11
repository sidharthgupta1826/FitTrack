import React from 'react';

interface ProgressRingProps {
  current: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  current,
  goal,
  size = 220,
  strokeWidth = 16,
  label = 'steps',
  sublabel,
}) => {
  const percentage = goal > 0 ? Math.min(Math.round((current / goal) * 100), 1000) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Calculate dash offset, clamped for ring visual (up to 100% fill, extra shown in badge)
  const displayPercent = Math.min(percentage, 100);
  const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#059669" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />

        {/* Animated Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#emeraldGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          strokeLinecap="round"
          filter="url(#glow)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center Metrics */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          {current.toLocaleString()}
        </span>
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
          {label}
        </span>
        {sublabel ? (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5">
            {sublabel}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-500 mt-1">
            Goal: {goal.toLocaleString()} ({percentage}%)
          </span>
        )}
      </div>
    </div>
  );
};
