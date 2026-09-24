import React from 'react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Home } from 'lucide-react';

export default function Unauthorized() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-[#111726] border border-slate-100 dark:border-slate-800/80 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
        
        {/* Glow Backlight Icon Wrapper */}
        <div className="relative h-20 w-20 mx-auto flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/50 shadow-inner">
          <div className="absolute inset-0 bg-rose-500/10 rounded-2xl blur-lg animate-pulse" />
          <ShieldAlert size={40} className="relative" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">
            Access Denied
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            You do not have the required permissions to view this page. Please return to your dashboard or sign in with another account.
          </p>
        </div>

        {/* Separator */}
        <div className="border-t border-slate-100 dark:border-slate-800/50" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            <Home size={14} /> Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
