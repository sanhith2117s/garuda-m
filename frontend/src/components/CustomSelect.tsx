import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  searchable?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select Option',
  className = '',
  required = false,
  searchable,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const showSearch = searchable !== undefined ? searchable : options.length >= 5;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      
      // Auto-detect if menu should open upwards
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 240 && rect.top > 240) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }

      if (showSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, showSearch]);

  const filteredOptions = showSearch && searchTerm.trim()
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase().trim()))
    : options;

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
        className="w-full bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-left font-semibold text-sm text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-all duration-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 gap-2"
      >
        <span className={`truncate whitespace-nowrap ${!selectedOption ? 'text-slate-400 dark:text-slate-500 font-medium' : ''}`}>{displayLabel}</span>
        <ChevronDown size={16} className={`text-slate-400 dark:text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 min-w-full w-max max-w-sm ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl z-[100] max-h-64 overflow-y-auto p-1.5 space-y-1 animate-in fade-in duration-200`}>
          {showSearch && (
            <div className="p-1 sticky top-0 bg-white dark:bg-[#162032] z-10 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 font-medium text-center">
              No matching options
            </div>
          ) : (
            filteredOptions.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(String(opt.value));
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left font-bold text-xs transition-all flex items-center justify-between rounded-xl cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-500 dark:bg-indigo-400'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
