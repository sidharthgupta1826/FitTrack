import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-900/90 text-white border-emerald-700',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />,
    },
    error: {
      bg: 'bg-red-900/90 text-white border-red-700',
      icon: <AlertCircle className="w-5 h-5 text-red-300 shrink-0" />,
    },
    info: {
      bg: 'bg-navy-900/90 text-white border-slate-700',
      icon: <Info className="w-5 h-5 text-sky-300 shrink-0" />,
    },
  }[toast.type || 'success'];

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div
        className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-md border ${typeConfig.bg}`}
      >
        {typeConfig.icon}
        <p className="text-sm font-semibold">{toast.message}</p>
      </div>
    </div>
  );
};
