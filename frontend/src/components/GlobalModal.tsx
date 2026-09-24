import React from 'react';
import { AlertTriangle, HelpCircle, CheckCircle, X } from 'lucide-react';
import { useModalStore, closeModal } from '../utils/modal';

export default function GlobalModal() {
  const { isOpen, type, title, message } = useModalStore();

  if (!isOpen) return null;

  const tLower = (title || '').toLowerCase();
  const mLower = (message || '').toLowerCase();

  const isSuccess = type !== 'confirm' && (
    tLower.includes('success') || 
    tLower.includes('ok') || 
    tLower.includes('saved') || 
    tLower.includes('updated') || 
    tLower.includes('created') || 
    tLower.includes('shuffled') ||
    tLower.includes('activated') ||
    tLower.includes('added') ||
    mLower.includes('success') ||
    mLower.includes('updated!') ||
    mLower.includes('created!')
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={() => {
          if (type === 'alert') closeModal(true);
          else closeModal(false);
        }}
      />

      {/* Modal Card */}
      <div 
        className="relative bg-white dark:bg-[#162032] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-900/20 w-full max-w-md overflow-hidden z-10 p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button 
          onClick={() => closeModal(type === 'alert' ? true : false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 border ${
          type === 'confirm' 
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' 
            : isSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
        }`}>
          {type === 'confirm' ? (
            <HelpCircle size={32} />
          ) : isSuccess ? (
            <CheckCircle size={32} />
          ) : (
            <AlertTriangle size={32} />
          )}
        </div>

        {/* Title & Message */}
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 px-2">{title}</h3>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed whitespace-pre-line px-2">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full">
          {type === 'confirm' && (
            <button
              onClick={() => closeModal(false)}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all border border-slate-200/60 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => closeModal(true)}
            className={`flex-1 py-3.5 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer ${
              type === 'confirm'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                : isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
            }`}
          >
            {type === 'confirm' ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
