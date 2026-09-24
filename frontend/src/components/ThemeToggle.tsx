import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-sm"
      aria-label="Toggle dark mode"
    >
      <span
        className={`${
          theme === 'dark' ? 'translate-x-7 bg-[#E8752D]' : 'translate-x-0 bg-white'
        } pointer-events-none inline-block h-8 w-8 transform rounded-full shadow-md ring-0 transition-transform duration-300 ease-in-out flex items-center justify-center`}
      >
        {theme === 'dark' ? (
          <Moon size={14} className="text-white animate-in zoom-in duration-300" />
        ) : (
          <Sun size={14} className="text-amber-500 animate-in zoom-in duration-300" />
        )}
      </span>
    </button>
  );
}
