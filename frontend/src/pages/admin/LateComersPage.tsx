import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import CustomDatePicker from '../../components/CustomDatePicker';
import { Search, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

type Tab = 'summary' | 'log';
interface Sem { id: number; semester_number: number; }
interface Summary { student_id: number; student_name: string; admn_no?: string; roll_number: string; semester: number; semester_id: number; count: number; limit: number; status: 'ok' | 'warning' | 'exceeded'; }

const statusBadge = (s: string) => {
  if (s === 'exceeded') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};
const StatusIcon = ({ s }: { s: string }) =>
  s === 'exceeded' ? <XCircle size={18} className="text-red-500" /> :
  s === 'warning'  ? <AlertTriangle size={18} className="text-amber-500" /> :
  <CheckCircle size={18} className="text-emerald-500" />;

import { fmtDate } from '../../utils/dateUtils';

export default function LateComersPage() {
  const token = useAuthStore(s => s.token);
  const userRole = useAuthStore(s => s.role);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };
  const [tab, setTab] = useState<Tab>('summary');
  const [semesters, setSemesters] = useState<Sem[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>(collegeId ? String(collegeId) : '');
  const [selSem, setSelSem] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [htno, setHtno] = useState(''); const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => { setCurrentPage(1); }, [tab, selectedCollege, selSem, htno, dateFrom, dateTo]);

  useEffect(() => { 
    axios.get('/api/admin/semesters?active_only=true', { headers }).then(r => setSemesters(r.data));
    axios.get('/api/admin/colleges', { headers }).then(r => setColleges(r.data)).catch(() => {});
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const targetCol = selectedCollege || (collegeId ? String(collegeId) : '');
      const p = new URLSearchParams();
      if (targetCol) p.append('college_id', targetCol);
      if (selSem) p.append('semester_id', selSem);
      if (htno) p.append('htno', htno);
      if (dateFrom) p.append('date_from', dateFrom);
      if (dateTo) p.append('date_to', dateTo);
      
      const url = tab === 'summary' 
        ? `/api/admin/latecomers/summary?${p.toString()}`
        : `/api/admin/latecomers/log?${p.toString()}`;
      setRows((await axios.get(url, { headers })).data);
    } finally { setLoading(false); }
  }, [tab, selectedCollege, collegeId, selSem, htno, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [tab, selectedCollege, selSem, fetch]);

  const inputClass = "w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Late Entries Recorded</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {rows.length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Repeat Latecomers (3+)</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {rows.filter(r => (r.count || 0) >= 3 || r.status === 'warning' || r.status === 'exceeded').length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Active View Mode</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1 capitalize">{tab} Mode</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle size={22} />
          </div>
        </div>
      </div>

      {/* Header Title & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h2 className="text-[#159A78] dark:text-emerald-400 font-black text-2xl tracking-tight">Latecomers Attendance History</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">Showing records directly in application. Filter by date or export to CSV.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm cursor-pointer">
            Refresh
          </button>
          <button onClick={() => {
            if (!rows.length) return;
            let csv = "";
            if (tab === 'summary') {
              csv = "Student,Roll No,Semester,Count,Limit\n" + rows.map(r => `"${r.student_name || ''}","${r.roll_number || ''}","Sem ${r.semester || ''}",${r.count ?? 0},${r.limit ?? 5}`).join("\n");
            } else {
              csv = "Student,Roll No,Semester,Scanned At\n" + rows.map(r => `"${r.student_name || ''}","${r.roll_number || ''}","Sem ${r.semester || ''}","${fmtDate(r.scanned_at)}"`).join("\n");
            }
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `latecomers_${tab}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
          }} className="px-5 py-2.5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center gap-2">
            Download CSV
          </button>
        </div>
      </div>

      <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 w-max">
        {([['summary', 'Summary (Count per Student)'], ['log', 'Detailed Log']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === k ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/80'}`}>{l}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-wrap gap-4 items-end">
        {userRole === 'super_admin' && (
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">College Filter</label>
            <CustomSelect
              value={selectedCollege}
              onChange={setSelectedCollege}
              options={[
                { value: '', label: 'All Colleges (NGIT | KMEC)' },
                ...colleges.map(c => ({ value: String(c.id), label: `${c.name} (${c.code})` }))
              ]}
              placeholder="All Colleges"
              className="w-56"
            />
          </div>
        )}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">Semester</label>
          <CustomSelect
            value={selSem}
            onChange={setSelSem}
            options={[
              { value: '', label: 'All Active' },
              ...semesters.map(s => ({ value: String(s.id), label: `Semester ${s.semester_number}` }))
            ]}
            placeholder="All Active"
            className="w-48"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">Admn No / Roll No</label>
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={htno} onChange={e => setHtno(e.target.value)} placeholder="Search..." className={`${inputClass} pl-9`} /></div>
        </div>
        {tab === 'log' && <>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">From</label>
            <CustomDatePicker
              value={dateFrom}
              onChange={(val: string) => {
                setDateFrom(val);
                if (dateTo && dateTo < val) {
                  setDateTo(val);
                }
              }}
              placeholder="Select Date"
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">To</label>
            <CustomDatePicker
              value={dateTo}
              onChange={setDateTo}
              min={dateFrom}
              placeholder="Select Date"
              className="w-40"
            />
          </div>
        </>}
        <button onClick={fetch} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors cursor-pointer">Search</button>
      </div>

      {/* Total Records Counter & Table Density Switcher */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
          Total Records: <span className="text-[#E8752D] dark:text-[#FB923C] font-black">{rows.length}</span>
        </span>
        <button
          onClick={() => setIsCompact(!isCompact)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          {isCompact ? '↔ Comfortable View' : '↕ Compact View'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading records...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 font-medium">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Clock size={24} />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200">No late-comer records found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or date filters</p>
        </div>
      ) : tab === 'summary' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm hidden md:table">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">
              <tr className="text-left text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                <th className={`px-6 ${isCompact ? 'py-2.5' : 'py-4'}`}>Student</th>
                <th className={`px-6 ${isCompact ? 'py-2.5' : 'py-4'}`}>College</th>
                <th className={`px-6 ${isCompact ? 'py-2.5' : 'py-4'}`}>Roll No</th>
                <th className={`px-6 ${isCompact ? 'py-2.5' : 'py-4'}`}>Sem</th>
                <th className={`px-6 ${isCompact ? 'py-2.5' : 'py-4'}`}>Late Count</th>
                <th className={`px-6 ${isCompact ? 'py-2.5' : 'py-4'}`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(rows as any[]).slice((currentPage - 1) * 10, currentPage * 10).map(r => (
                <tr key={`${r.student_id}-${r.semester_id}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                        <img 
                          src={r.photo_url} 
                          alt={r.student_name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.student_name)}&background=f3f4f6&color=6b7280&bold=true`; }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{r.student_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                      {r.college_code || (r.roll_number && (r.roll_number.includes('NG') || r.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#159A78] dark:text-[#34D399] font-black uppercase">{r.roll_number}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">Sem {r.semester}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-full transition-all ${r.status === 'exceeded' ? 'bg-red-500' : r.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (r.count / r.limit) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{r.count} / {r.limit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon s={r.status} />
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${statusBadge(r.status)}`}>{r.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 10-Record Pagination Bar */}
          {Math.ceil(rows.length / PAGE_SIZE) > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length} records</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(rows.length / PAGE_SIZE) }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(rows.length / PAGE_SIZE), currentPage + 2)).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  disabled={currentPage === Math.ceil(rows.length / PAGE_SIZE)}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(rows.length / PAGE_SIZE)))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">College</th>
                <th className="px-6 py-4">Roll No</th>
                <th className="px-6 py-4">Sem</th>
                <th className="px-6 py-4">Scanned At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{r.student_name}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                      {r.college_code || (r.roll_number && (r.roll_number.includes('NG') || r.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600 bg-gray-50 rounded px-2">{r.roll_number}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">Sem {r.semester}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{fmtDate(r.scanned_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
             {rows.map((r: any) => (
               <div key={r.id} className="p-5 space-y-3">
                 <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{r.student_name}</span>
                    <span className="font-mono text-[9px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase tracking-widest">{r.roll_number}</span>
                 </div>
                 <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 border-t border-gray-50 pt-2">
                    <span>Semester {r.semester}</span>
                    <span className="font-mono text-gray-400">{fmtDate(r.scanned_at)}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
