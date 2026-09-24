import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function CustomDatePicker({
  value,
  onChange,
  min = '',
  max = '',
  placeholder = 'Select Date',
  className = '',
  required = false,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or default to today
  const today = new Date();
  const getInitialYearMonth = () => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return {
          y: parseInt(parts[0], 10),
          m: parseInt(parts[1], 10) - 1,
        };
      }
    }
    return {
      y: today.getFullYear(),
      m: today.getMonth(),
    };
  };

  const initial = getInitialYearMonth();
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [yearPageStart, setYearPageStart] = useState(initial.y - 7);

  // Reset view to value when value changes or calendar opens
  useEffect(() => {
    if (isOpen) {
      const current = getInitialYearMonth();
      setViewYear(current.y);
      setViewMonth(current.m);
      setViewMode('days');
      setYearPageStart(current.y - 7);
    }
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Helper date formatting
  const formatDateString = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Date boundary check
  const isDateDisabled = (dateStr: string) => {
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // Sunday is 0

  const daysGrid: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

  // Trailing days from previous month
  const prevMonthYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevMonthIndex = viewMonth === 0 ? 11 : viewMonth - 1;
  const daysInPrevMonth = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    daysGrid.push({
      day: dayNum,
      isCurrentMonth: false,
      dateStr: formatDateString(prevMonthYear, prevMonthIndex, dayNum),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push({
      day: i,
      isCurrentMonth: true,
      dateStr: formatDateString(viewYear, viewMonth, i),
    });
  }

  // Leading days from next month to complete the grid (multiples of 7)
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1;
  const remainingCells = 42 - daysGrid.length;

  for (let i = 1; i <= remainingCells; i++) {
    daysGrid.push({
      day: i,
      isCurrentMonth: false,
      dateStr: formatDateString(nextMonthYear, nextMonthIndex, i),
    });
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-left font-bold text-[13px] text-slate-700 dark:text-slate-200 cursor-pointer flex justify-between items-center transition-all duration-300 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-950/50"
      >
        <span className={!value ? 'text-slate-400' : ''}>
          {value ? value : placeholder}
        </span>
        <CalendarIcon size={16} className="text-slate-400 dark:text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#111726] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-xl z-50 p-4 w-[280px] sm:w-[320px] mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header controls */}
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={
                viewMode === 'days'
                  ? handlePrevMonth
                  : viewMode === 'years'
                  ? () => setYearPageStart(p => p - 16)
                  : () => setViewYear(y => y - 1)
              }
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex gap-1 items-center font-bold text-sm text-slate-800 dark:text-slate-200">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className={`px-2 py-0.5 rounded-lg transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:text-indigo-650 dark:hover:text-indigo-350 cursor-pointer ${
                  viewMode === 'months' ? 'text-indigo-600 dark:text-indigo-400' : ''
                }`}
              >
                {months[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                className={`px-2 py-0.5 rounded-lg transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:text-indigo-650 dark:hover:text-indigo-350 cursor-pointer ${
                  viewMode === 'years' ? 'text-indigo-600 dark:text-indigo-400' : ''
                }`}
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              onClick={
                viewMode === 'days'
                  ? handleNextMonth
                  : viewMode === 'years'
                  ? () => setYearPageStart(p => p + 16)
                  : () => setViewYear(y => y + 1)
              }
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {viewMode === 'days' && (
            <>
              {/* Weekdays header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, idx) => (
                  <span key={idx} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {d}
                  </span>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysGrid.map((cell, idx) => {
                  const isSelected = value === cell.dateStr;
                  const disabled = isDateDisabled(cell.dateStr);
                  
                  // Base button styling
                  let btnClass = 'h-8 w-8 sm:h-9 sm:w-9 rounded-xl font-bold text-[12px] flex items-center justify-center transition-all cursor-pointer mx-auto ';
                  
                  if (disabled) {
                    btnClass += 'text-slate-200 dark:text-slate-800 cursor-not-allowed hover:bg-transparent ';
                  } else if (isSelected) {
                    btnClass += 'bg-indigo-600 text-white shadow-sm shadow-indigo-150 ';
                  } else if (cell.isCurrentMonth) {
                    btnClass += 'text-slate-700 dark:text-slate-350 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 ';
                  } else {
                    btnClass += 'text-slate-300 dark:text-slate-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:text-indigo-400 dark:hover:text-indigo-400 ';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onChange(cell.dateStr);
                        setIsOpen(false);
                      }}
                      className={btnClass}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {months.map((m, idx) => {
                const isSelected = viewMonth === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setViewMode('days');
                    }}
                    className={`py-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-350 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300'
                    }`}
                  >
                    {m.substring(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'years' && (
            <div className="grid grid-cols-4 gap-2 py-2">
              {Array.from({ length: 16 }, (_, i) => yearPageStart + i).map((y) => {
                const isSelected = viewYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewYear(y);
                      setViewMode('days');
                    }}
                    className={`py-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-350 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
