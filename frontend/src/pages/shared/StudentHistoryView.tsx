import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { Search, Clock, Calendar, ShieldCheck, AlertTriangle, UserCheck, AlertCircle, FileText, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface StudentHistoryData {
  student: {
    id: number;
    full_name: string;
    roll_number: string;
    admn_no: string;
    college_name: string;
    department_name: string;
    branch: string;
    section: string;
    section_display: string;
    semester: number;
    year_roman: string;
    photo_url: string;
    status: string;
    parent_phone: string;
  };
  pass_summary: {
    max_normal_passes: number;
    used_normal_passes: number;
    used_emergency_passes: number;
    limit_reached: boolean;
  };
  late_summary: {
    max_late_entries: number;
    late_count: number;
    limit_exceeded: boolean;
  };
  leave_requests: any[];
  late_entries: any[];
  custom_passes: any[];
}

export default function StudentHistoryView() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentHistoryData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced live search
  useEffect(() => {
    if (!searchInput.trim() || searchInput.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const colParam = collegeId ? `&college_id=${collegeId}` : '';
        const res = await axios.get(`/api/admin/directory?search=${encodeURIComponent(searchInput.trim())}${colParam}`, { headers });
        const items = res.data.items || res.data || [];
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearch = async (rollOrAdmn: str) => {
    if (!rollOrAdmn.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setShowSuggestions(false);

    try {
      const res = await axios.get(`/api/admin/directory/student-history/${encodeURIComponent(rollOrAdmn.trim())}`, { headers });
      setData(res.data);
    } catch (err: any) {
      setData(null);
      setErrorMsg(err.response?.data?.detail || 'Student history record not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 relative">
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="text-emerald-500" size={20} /> Student Lifetime History Inspection
        </h2>

        <div className="relative max-w-2xl">
          <input
            type="text"
            placeholder="Search by Student Roll Number or Admission Number (e.g. 245525733187)..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(searchInput); }}
            className="w-full pl-11 pr-28 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <Search size={18} className="absolute left-4 top-4 text-slate-400" />

          <button
            type="button"
            onClick={() => handleSearch(searchInput)}
            className="absolute right-2 top-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {loading ? 'Searching...' : 'Inspect'}
          </button>

          {/* Live Search Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSearchInput(s.roll_number);
                    handleSearch(s.roll_number);
                  }}
                  className="w-full p-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700/60 rounded-xl flex items-center justify-between transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`/api/static/photos/${s.roll_number}.jpg`}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover bg-slate-200 dark:bg-slate-700"
                      onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=059669&color=fff`; }}
                    />
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{s.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.roll_number} • {s.branch} {s.section}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">View History</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
      </div>

      {/* Student History Dashboard */}
      {data && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Top Identity Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-md">
                <img
                  src={`/api/static/photos/${data.student.roll_number}.jpg`}
                  alt={data.student.full_name}
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.src = data.student.photo_url; }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{data.student.full_name}</h3>
                  <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-extrabold uppercase">
                    {data.student.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{data.student.roll_number}</span>
                  <span>•</span>
                  <span>Admn: {data.student.admn_no}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-md">
                    {data.student.section_display}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  College: <strong className="text-slate-800 dark:text-slate-200">{data.student.college_name} ({data.student.college_code})</strong> | Dept: <strong className="text-slate-800 dark:text-slate-200">{data.student.department_name}</strong> | Parent Phone: <strong className="text-slate-800 dark:text-slate-200">{data.student.parent_phone}</strong>
                </p>
              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 gap-3 shrink-0 w-full md:w-auto">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl text-center space-y-0.5 min-w-36">
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-wider">Outpasses (Sem {data.student.semester})</span>
                <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                  {data.pass_summary.used_normal_passes} <span className="text-xs font-normal text-emerald-600">/ {data.pass_summary.max_normal_passes}</span>
                </p>
                {data.pass_summary.used_emergency_passes > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">+ {data.pass_summary.used_emergency_passes} Emergency Passes</span>
                )}
              </div>

              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl text-center space-y-0.5 min-w-36">
                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider">Late Entries</span>
                <p className="text-2xl font-black text-amber-900 dark:text-amber-100">
                  {data.late_summary.late_count} <span className="text-xs font-normal text-amber-600">/ {data.late_summary.max_late_entries}</span>
                </p>
                {data.late_summary.limit_exceeded && (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">Strike Limit Reached!</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gate Outpass Timeline */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h4 className="font-black text-slate-900 dark:text-white flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <FileText size={16} className="text-emerald-500" /> Outpass Activity Timeline ({data.leave_requests.length})
                </span>
              </h4>

              {data.leave_requests.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {data.leave_requests.map((lr: any) => (
                    <div key={lr.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{lr.reason}</span>
                          {lr.is_emergency && (
                            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-black rounded-md">Emergency</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Window: {lr.out_time} → {lr.in_time} | Created: {lr.created_at ? lr.created_at.slice(0, 10) : ''}
                        </p>
                        {lr.remarks && <p className="text-[10px] italic text-slate-400">"{lr.remarks}"</p>}
                      </div>

                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 ${lr.status === 'returned' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : lr.status === 'exited' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {lr.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">No outpass requests found for this student.</p>
              )}
            </div>

            {/* Latecomer & Custom Pass Timeline */}
            <div className="space-y-6">
              {/* Late Entries Log */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} className="text-amber-500" /> Late Entry Strikes ({data.late_entries.length})
                </h4>

                {data.late_entries.length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {data.late_entries.map((lt: any) => (
                      <div key={lt.id} className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-amber-900 dark:text-amber-200 block">Late Gate Entry</span>
                          <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">{lt.timestamp ? new Date(lt.timestamp).toLocaleString('en-IN') : '—'}</span>
                        </div>
                        {lt.is_excused ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">Excused</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">Strike</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">Clean latecomer record (0 strikes).</p>
                )}
              </div>

              {/* Custom Passes Log */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <ShieldCheck size={16} className="text-indigo-500" /> Assigned Custom Passes ({data.custom_passes.length})
                </h4>

                {data.custom_passes.length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {data.custom_passes.map((cp: any) => (
                      <div key={cp.id} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-indigo-900 dark:text-indigo-200 block">{cp.pass_name}</span>
                          <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400">Valid: {cp.valid_from} to {cp.valid_to} ({cp.out_time} → {cp.in_time})</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${cp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {cp.is_active ? 'Active' : 'Expired'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">No custom passes assigned.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
