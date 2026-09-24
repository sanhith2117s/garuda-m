import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from '../utils/toast';

export default function ToastOverlay() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        // Default / Info toast (Dark slate background with white text)
        let bgClass = 'bg-slate-900 dark:bg-slate-900 text-white border-slate-700 shadow-slate-900/30';
        let Icon = Info;
        let iconColor = 'text-sky-300';

        // Success toast
        if (t.type === 'success') {
          bgClass = 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/25';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-100';
        }
        // Error toast
        else if (t.type === 'error') {
          bgClass = 'bg-rose-600 dark:bg-rose-600 text-white border-rose-500 shadow-rose-600/25';
          Icon = AlertCircle;
          iconColor = 'text-rose-100';
        }
        // Warning toast
        else if (t.type === 'warning') {
          bgClass = 'bg-amber-500 dark:bg-amber-500 text-white border-amber-400 shadow-amber-500/25';
          Icon = AlertTriangle;
          iconColor = 'text-amber-100';
        }

        // Clean leading emojis if present to avoid double icon rendering
        const cleanMsg = t.message.replace(/^[❌✅⚠️ℹ️🟢📄🔴]\s*/, '');

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${bgClass}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon size={20} className={`shrink-0 ${iconColor}`} />
              <p className="text-xs font-black tracking-wide leading-snug break-words text-white !text-white" style={{ color: '#ffffff' }}>{cleanMsg}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0 cursor-pointer text-white"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}