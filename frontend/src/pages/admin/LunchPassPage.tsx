import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import CustomDatePicker from '../../components/CustomDatePicker';
import { Search, Plus, Trash2, ShieldCheck, Ticket } from 'lucide-react';
import { showConfirm } from '../../utils/modal';
import { fmtDate } from '../../utils/dateUtils';

type Tab = 'passes' | 'issue-history' | 'scan-history' | 'monitoring';
interface Sem { id: number; semester_number: number; }

export default function LunchPassPage() {
  const token = useAuthStore(s => s.token);
  const userRole = useAuthStore(s => s.role);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [tab, setTab] = useState<Tab>('passes');
  const [statusFilter, setStatusFilter] = useState<'all' | 'away' | 'missing'>('all');
  const [semesters, setSemesters] = useState<Sem[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>(collegeId ? String(collegeId) : '');
  const [selSem, setSelSem] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [htno, setHtno] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [issueAdmn, setIssueAdmn] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueMsg, setIssueMsg] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => { setCurrentPage(1); }, [tab, selectedCollege, selSem, htno, dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    axios.get('/api/admin/semesters?active_only=true', { headers }).then(r => setSemesters(r.data));
    axios.get('/api/admin/colleges', { headers }).then(r => setColleges(r.data)).catch(() => { });
  }, []);

  useEffect(() => {
    if (!issueAdmn.trim() || issueAdmn.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/admin/lunch/students-search?q=${encodeURIComponent(issueAdmn.trim())}`, { headers });
        setSuggestions(res.data);
        setShowSuggestions(res.data.length > 0);
      } catch (err) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [issueAdmn]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const targetCol = selectedCollege || (collegeId ? String(collegeId) : '');
      if (tab === 'monitoring') {
        const p = new URLSearchParams();
        if (targetCol) p.append('college_id', targetCol);
        if (dateFrom) p.append('date_from', dateFrom);
        if (dateTo) p.append('date_to', dateTo);
        const url = `/api/gate/lunch-monitoring?${p.toString()}`;
        setRows((await axios.get(url, { headers })).data);
        return;
      }
      const p = new URLSearchParams();
      if (targetCol) p.append('college_id', targetCol);
      if (selSem) p.append('semester_id', selSem);
      if (htno) p.append('htno', htno);
      if (dateFrom) p.append('date_from', dateFrom);
      if (dateTo) p.append('date_to', dateTo);
      const params = p.toString();
      const url = tab === 'passes' ? `/api/admin/lunch/passes?${params}` : tab === 'issue-history' ? `/api/admin/lunch/issue-history?${params}` : `/api/admin/lunch/scan-history?${params}`;
      setRows((await axios.get(url, { headers })).data);
    } finally { setLoading(false); }
  }, [tab, selectedCollege, collegeId, selSem, htno, dateFrom, dateTo, token]);

  useEffect(() => { fetch(); }, [tab, selectedCollege, selSem, dateFrom, dateTo, token]);

  const filteredRows = React.useMemo(() => {
    if (tab !== 'monitoring') return rows;
    return rows.filter(r => {
      if (selSem && String(r.semester) !== selSem) return false;
      if (htno.trim()) {
        const q = htno.toLowerCase();
        const matches = (
          (r.roll_number || '').toLowerCase().includes(q) ||
          (r.admn_no || '').toLowerCase().includes(q) ||
          (r.student_name || '').toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, tab, selSem, htno, statusFilter]);

  const [lunchReceiptModal, setLunchReceiptModal] = useState<any | null>(null);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault(); setIssuing(true); setIssueMsg('');
    try {
      const res = await axios.post('/api/admin/lunch/issue', { admn_no: issueAdmn }, { headers });
      setIssueMsg('✅ ' + res.data.message);
      if (res.data.student) {
        setLunchReceiptModal(res.data.student);
      }
      setIssueAdmn('');
      await fetch();
    } catch (e: any) { setIssueMsg('❌ ' + (e.response?.data?.detail || 'Failed')); }
    finally { setIssuing(false); }
  };

  const revokePass = async (id: number) => {
    if (!(await showConfirm('Revoke Lunch Pass', 'Are you sure you want to revoke this lunch pass?'))) return;
    await axios.delete(`/api/admin/lunch/revoke/${id}`, { headers }); await fetch();
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium";

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Lunch Passes Issued</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{rows.length}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
            <Ticket size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Scanned at Canteen</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {rows.filter(r => r.scanned_at || r.scanned || r.status === 'away').length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Current View Filter</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1 capitalize">{tab.replace('-', ' ')}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
            <Search size={22} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 w-max">
        {([['passes', 'Active Passes'], ['issue-history', 'Issue History'], ['scan-history', 'Scan History'], ['monitoring', 'Lunch Monitoring']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === k ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/80'}`}>{l}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 flex flex-wrap gap-4 items-end">
        {userRole === 'super_admin' && (
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">College Filter</label>
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
              { value: '', label: 'All Semesters' },
              ...semesters.map(s => ({ value: String(s.id), label: `Semester ${s.semester_number}` }))
            ]}
            placeholder="All Semesters"
            className="w-48"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">Admn No / Roll No</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={htno} onChange={e => setHtno(e.target.value)} placeholder="Search..." className={`${inputClass} pl-9`} />
          </div>
        </div>
        {(tab === 'issue-history' || tab === 'scan-history' || tab === 'monitoring') && (
          <>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">From</label>
              <CustomDatePicker
                value={dateFrom}
                onChange={(val: string) => {
                  setDateFrom(val);
                  if (dateTo && dateTo < val) setDateTo(val);
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
          </>
        )}
        <button onClick={fetch} className="px-6 py-2.5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-lg text-sm font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer">
          Search
        </button>
      </div>

      {/* 2-Column Grid Layout for Passes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Issue Lunch Pass Form (4 cols) */}
        {tab === 'passes' && userRole !== 'super_admin' && (
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5 overflow-visible">
            <div>
              <h3 className="text-slate-900 dark:text-white font-black text-lg tracking-tight flex items-center gap-2">
                <Ticket size={20} className="text-[#E8752D]" /> Issue Lunch Pass
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Search student and activate instant lunch pass</p>
            </div>

            {issueMsg && (
              <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${issueMsg.startsWith('✅')
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                {issueMsg}
              </div>
            )}

            <form onSubmit={handleIssue} className="space-y-4 relative">
              <div className="relative">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider mb-2 block">
                  Student Directory Lookup
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    required
                    value={issueAdmn}
                    onChange={e => setIssueAdmn(e.target.value.toUpperCase())}
                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                    placeholder="Type roll number or name..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-1">
                    {suggestions.map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setIssueAdmn(s.roll_number);
                          setShowSuggestions(false);
                        }}
                        className="p-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700/80 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">{s.full_name}</div>
                          <div className="text-[11px] font-mono text-slate-400 font-semibold">{s.admn_no ? `Admn: ${s.admn_no}` : ''}</div>
                        </div>
                        <span className="font-mono text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 uppercase">
                          {s.roll_number}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={issuing || !issueAdmn.trim()}
                className="w-full py-3.5 px-5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> {issuing ? 'Issuing...' : 'Issue Pass'}
              </button>
            </form>
          </div>
        )}

        {/* Right Column: Table Directory (8 cols when pass form visible, 12 cols otherwise) */}
        <div className={tab === 'passes' && userRole !== 'super_admin' ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {loading ? (
            <div className="text-center py-20 text-slate-500 font-medium">Loading records...</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 font-medium">No records found.</div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr className="text-left text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {tab === 'monitoring' ? (
                      <>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">College</th>
                        <th className="px-6 py-4">Roll No / Class</th>
                        <th className="px-6 py-4">Out Time</th>
                        <th className="px-6 py-4">In Time</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Contact Info</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">College</th>
                        <th className="px-6 py-4">Roll No</th>
                        <th className="px-6 py-4">Sem</th>
                        <th className="px-6 py-4">{tab === 'scan-history' ? 'Type' : 'Issued At'}</th>
                        {tab === 'scan-history' && <th className="px-6 py-4">Scanned At</th>}
                        {tab === 'passes' && <th className="px-6 py-4 text-right">Action</th>}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {tab === 'monitoring' ? (
                    filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((r: any) => (
                      <tr key={r.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{r.student_name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{r.admn_no}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                            {r.college_code || (r.roll_number && (r.roll_number.includes('NG') || r.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 inline-block">{r.roll_number}</div>
                          <div className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Sem {r.semester} • {r.branch}-{r.section}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                          {r.out_time ? new Date(r.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                          {r.in_time ? new Date(r.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-tight ${r.status === 'returned'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : r.status === 'away'
                              ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Parent: <span className="font-mono text-slate-800 dark:text-slate-200">{r.parent_phone || '—'}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{r.student_name}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                            {r.college_code || (r.roll_number && (r.roll_number.includes('NG') || r.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 inline-block">{r.roll_number}</td>
                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">Sem {r.semester}</td>
                        <td className="px-6 py-4">
                          {tab === 'scan-history'
                            ? <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${r.scan_type === 'out' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{r.scan_type}</span>
                            : <span className="text-slate-600 dark:text-slate-400 font-medium">{fmtDate(r.issued_at)}</span>}
                        </td>
                        {tab === 'scan-history' && <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{fmtDate(r.scanned_at)}</td>}
                        {tab === 'passes' && (
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => revokePass(r.id)} className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer" title="Revoke Lunch Pass">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* 10-Record Pagination Bar */}
              {Math.ceil(filteredRows.length / PAGE_SIZE) > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} records</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.ceil(filteredRows.length / PAGE_SIZE) }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(filteredRows.length / PAGE_SIZE), currentPage + 2)).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${currentPage === pageNum
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === Math.ceil(filteredRows.length / PAGE_SIZE)}
                      onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredRows.length / PAGE_SIZE)))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lunch Pass Issued Receipt Verification Popup Modal */}
      {lunchReceiptModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-emerald-200 dark:border-emerald-800">
                <Ticket size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Lunch Pass Issued!</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Student Verification Badge</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600">
                <img
                  src={`/api/static/photos/${lunchReceiptModal.roll_number}.jpg`}
                  alt={lunchReceiptModal.full_name}
                  className="w-full h-full object-cover"
                  onError={(e: any) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(lunchReceiptModal.full_name)}&background=059669&color=fff&bold=true`;
                  }}
                />
              </div>
              <div className="space-y-1 overflow-hidden">
                <div className="font-black text-slate-900 dark:text-white text-base truncate">{lunchReceiptModal.full_name}</div>
                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block uppercase">
                  {lunchReceiptModal.roll_number}
                </div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                  Sem {lunchReceiptModal.semester} • {lunchReceiptModal.branch || 'CSE'}-{lunchReceiptModal.section || 'A'}
                </div>
                {lunchReceiptModal.admn_no && (
                  <div className="text-[10px] text-slate-400 font-mono">Admn: {lunchReceiptModal.admn_no}</div>
                )}
              </div>
            </div>

            <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                ✅ Lunch Pass Activated
              </span>
            </div>

            <button
              onClick={() => setLunchReceiptModal(null)}
              className="w-full py-3 bg-[#E8752D] hover:bg-[#D96622] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
