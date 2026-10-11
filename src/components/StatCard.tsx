import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  badge?: string;
  color?: 'emerald' | 'blue' | 'amber' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  unit,
  subtext,
  badge,
  color = 'emerald',
  onClick,
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    blue: {
      bg: 'bg-sky-50 text-sky-600',
      badge: 'bg-sky-100 text-sky-800',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      badge: 'bg-amber-100 text-amber-800',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      badge: 'bg-purple-100 text-purple-800',
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-soft hover:shadow-card transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-emerald-200' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${scheme.bg}`}>{icon}</div>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${scheme.badge}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold text-navy-900 tracking-tight">{value}</span>
          {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
        </div>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
    </div>
  );
};
