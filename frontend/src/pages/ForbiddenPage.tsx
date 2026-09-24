import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, FileQuestion, LayoutDashboard, Lock, ArrowLeft } from 'lucide-react';

interface ForbiddenPageProps {
  type?: '404' | '403';
  path?: string;
}

export default function ForbiddenPage({ type = '404', path = '' }: ForbiddenPageProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/admin/dashboard', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const is404 = type === '404';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
      <div className="bg-white dark:bg-[#162032] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Icon Container */}
        <div className={`w-20 h-20 mx-auto rounded-3xl border flex items-center justify-center shadow-lg ${
          is404
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 shadow-amber-500/10'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 shadow-rose-500/10'
        }`}>
          {is404 ? <FileQuestion size={42} /> : <ShieldAlert size={42} />}
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            is404
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            <Lock size={12} /> {is404 ? '404 • PAGE NOT FOUND' : '403 • ACCESS RESTRICTED'}
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {is404 ? 'Page Not Found' : 'Restricted Module'}
          </h2>
          
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            {is404 ? (
              <>The requested page or route <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 font-bold">{path || 'url'}</code> does not exist in the Garuda system.</>
            ) : (
              <>You do not have permission to access this module with your current staff account role.</>
            )}
          </p>
        </div>

        {/* Auto-redirect indicator */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Auto returning to Dashboard in <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{countdown}s</strong>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate('/admin/dashboard', { replace: true })}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LayoutDashboard size={16} /> Return to Dashboard Immediately
        </button>
      </div>
    </div>
  );
}
