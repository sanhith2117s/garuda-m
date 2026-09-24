import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';
import { ShieldCheck, ShieldOff, Search, CheckCircle, Phone, MessageSquare, Filter, FileText, X, Download } from 'lucide-react';

type Tab = 'active' | 'history';
interface Row {
  id: number; student_name: string; admn_no?: string; roll_number: string;
  reason: string; notes?: string; status?: string; gate_activated?: boolean;
  approved_at?: string; requested_at: string; photo_url?: string;
  parent_called?: boolean; remarks?: string;
  parent_phone?: string; secondary_phone?: string;
  section?: string; college_code?: string;
}

import { fmtDate } from '../../utils/dateUtils';

const statusColor: Record<string, string> = {
  approved: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  rejected: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  exited: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  pending: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  expired: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

export default function GatePassPage() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [tab, setTab] = useState<Tab>('active');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [htno, setHtno] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 10, 25, 50, 100, 0 (All)
  const [actionId, setActionId] = useState<number | null>(null);
  const [showSecondary, setShowSecondary] = useState<{ [id: number]: boolean }>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [notesModalContent, setNotesModalContent] = useState<{ title: string; notes: string } | null>(null);

  useEffect(() => { setCurrentPage(1); }, [tab, htno, dateFrom, dateTo, selectedSection, pageSize]);

  const revokeBatch = async (batchNote: string) => {
    if (!window.confirm(`Are you sure you want to revoke all active passes for '${batchNote}'?`)) return;
    try {
      await axios.post(`/api/gate/revoke-batch/${encodeURIComponent(batchNote)}`, {}, { headers });
      await fetch();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRows = React.useMemo(() => {
    if (!Array.isArray(rows)) return [];
    const list = rows.filter(r => {
      if (!r) return false;
      if (selectedSection && r.section !== selectedSection) return false;
      if (!htno.trim()) return true;
      const search = htno.toLowerCase().trim();
      const sName = (r.student_name || '').toLowerCase();
      const sAdmn = (r.admn_no || '').toLowerCase();
      const sRoll = (r.roll_number || '').toLowerCase();
      const sNotes = (r.notes || '').toLowerCase();
      return sName.includes(search) || sAdmn.includes(search) || sRoll.includes(search) || sNotes.includes(search);
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.approved_at || a.requested_at || 0).getTime();
      const timeB = new Date(b.approved_at || b.requested_at || 0).getTime();
      return timeB - timeA;
    });
  }, [rows, tab, htno, selectedSection]);

  const effectivePageSize = pageSize > 0 ? pageSize : (filteredRows.length || 1);
  const totalPages = Math.ceil(filteredRows.length / effectivePageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);

  const handleExportCSV = () => {
    if (!rows.length) return;
    const headers = ["Student Name", "Roll Number", "Admission No", "Reason", "Approved At", "Administrative Notes"];
    const csvContent = [
      headers.join(","),
      ...rows.map(r => [
        `"${(r.student_name || '').replace(/"/g, '""')}"`,
        `"${(r.roll_number || '').replace(/"/g, '""')}"`,
        `"${(r.admn_no || '').replace(/"/g, '""')}"`,
        `"${(r.reason || '').replace(/"/g, '""')}"`,
        `"${r.approved_at ? new Date(r.approved_at).toLocaleString() : ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gate_passes_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const colParam = collegeId ? `college_id=${collegeId}` : '';
      const limitParam = pageSize > 0 ? `limit=0` : ''; // fetch all matching history records, frontend paginates
      const queryParts = [colParam, limitParam].filter(Boolean).join('&');
      const url = tab === 'active'
        ? `/api/gate/active-passes${queryParts ? `?${queryParts}` : ''}`
        : `/api/gate/history${queryParts ? `?${queryParts}&` : '?'}` + `htno=${htno}&date_from=${dateFrom}&date_to=${dateTo}`;
      const res = await axios.get(url, { headers });
      setRows(Array.isArray(res.data) ? res.data : (res.data.items || []));
    } finally { setLoading(false); }
  }, [tab, htno, dateFrom, dateTo, collegeId, token, pageSize]);

  useEffect(() => { fetch(); }, [tab, collegeId, token, fetch]);

  const handleCopy = (id: number, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deactivate = async (id: number) => { setActionId(id); try { await axios.post(`/api/gate/${id}/deactivate`, {}, { headers }); await fetch(); } finally { setActionId(null); } };

  const tabs: [Tab, string][] = [['active', 'Active Passes'], ['history', 'History']];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Active Outpasses</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              {rows.filter(r => r.status === 'approved' || r.status === 'exited' || !r.status).length}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Exited Gate Today</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {rows.filter(r => r.status === 'exited').length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Emergency / Medical</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {rows.filter(r => (r.reason || '').toLowerCase().includes('medical') || (r.reason || '').toLowerCase().includes('emergency')).length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Filtered Passes</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{rows.length}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* Section Title & Tabs Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Active Outpasses Directory</h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Monitor real-time gate outpasses and historical leave logs</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-1.5 shadow-inner border border-slate-200/80 dark:border-slate-800">
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${tab === key
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters Card */}
      <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider mb-2 block">
            Admn No / Roll No Search
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
            <input
              value={htno}
              onChange={e => setHtno(e.target.value)}
              placeholder="Filter by roll number..."
              className="w-full bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider mb-2 block">
            Section Filter
          </label>
          <CustomSelect
            value={selectedSection}
            onChange={setSelectedSection}
            options={[
              { value: '', label: 'All Sections' },
              { value: 'A', label: 'Section A' },
              { value: 'B', label: 'Section B' },
              { value: 'C', label: 'Section C' },
              { value: 'D', label: 'Section D' },
            ]}
            placeholder="All Sections"
            className="w-40"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider mb-2 block">From</label>
          <CustomDatePicker
            value={dateFrom}
            onChange={(val) => {
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
          <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider mb-2 block">To</label>
          <CustomDatePicker
            value={dateTo}
            onChange={setDateTo}
            min={dateFrom}
            placeholder="Select Date"
            className="w-40"
          />
        </div>
        <button onClick={fetch} className="px-5 py-2.5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center gap-2">
          <Filter size={14} /> Filter
        </button>
        <button onClick={handleExportCSV} disabled={!rows.length} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2" title="Download filtered outpasses as CSV">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white dark:bg-[#162032] rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
          Loading records…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#162032] rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center mx-auto mb-4 text-[#E8752D] dark:text-[#FB923C] shadow-sm">
            <CheckCircle className="w-8 h-8" />
          </div>
          <p className="text-slate-900 dark:text-white font-extrabold text-base mb-1">No Records Found</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">There are no gate passes matching your current view or search filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {paginatedRows.map(r => {
              const activePhone = showSecondary[r.id] ? r.secondary_phone : r.parent_phone;
              return (
                <div key={r.id} className="bg-white dark:bg-[#162032] rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-200 p-3.5 space-y-2.5">
                  {/* Main Row: Avatar, Student Info, Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-100 dark:bg-slate-800 shadow-inner">
                        <img src={r.photo_url} alt={r.student_name} className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.student_name)}&background=f3f4f6&color=6b7280&bold=true`; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">{r.student_name}</span>
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold border border-slate-200 dark:border-slate-700 uppercase">{r.roll_number}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80">
                            College: {r.college_code || (r.roll_number && (r.roll_number.includes('NG') || r.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                          </span>
                          {r.status && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusColor[r.status] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>{r.status}</span>}
                          {r.parent_called && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                              <Phone size={9} /> Parent Called
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] mt-0.5">
                          <span className="font-bold text-[#E8752D] dark:text-[#FB923C] uppercase">{r.reason} Leave</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">Issued: {fmtDate(r.approved_at || r.requested_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Action button */}
                    {tab === 'active' && (
                      <div className="flex items-center justify-end flex-shrink-0">
                        <button
                          disabled={actionId === r.id}
                          onClick={() => deactivate(r.id)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-lg text-[11px] font-extrabold uppercase tracking-wider hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <ShieldOff size={13} /> Revoke Pass
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Compact Admin Notes Bar with Bulk Batch Revoke Action */}
                  {r.notes && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText size={13} className="text-[#E8752D] dark:text-[#FB923C] shrink-0" />
                        <span className="text-[10px] font-extrabold text-[#E8752D] dark:text-[#FB923C] uppercase shrink-0">Notes:</span>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{r.notes}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(r.notes.toLowerCase().includes('bulk') || r.notes.toLowerCase().includes('batch') || r.notes.toLowerCase().includes('section')) && tab === 'active' && (
                          <button
                            onClick={() => revokeBatch(r.notes!)}
                            className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 transition-colors uppercase cursor-pointer"
                          >
                            Revoke Entire Batch
                          </button>
                        )}
                        <button
                          onClick={() => setNotesModalContent({ title: `${r.student_name} (${r.roll_number})`, notes: r.notes! })}
                          className="text-[9px] font-bold text-[#E8752D] dark:text-[#FB923C] hover:underline uppercase shrink-0 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 cursor-pointer"
                        >
                          View...
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Compact Mentor Remarks */}
                  {r.remarks && (
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-2">
                      <MessageSquare size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase shrink-0">Remarks:</span>
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 italic truncate">"{r.remarks}"</span>
                    </div>
                  )}

                  {/* Compact Phone Row */}
                  {(r.parent_phone || r.secondary_phone) && tab === 'active' && (
                    <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{showSecondary[r.id] ? 'Sec:' : 'Pri:'}</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{activePhone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {r.secondary_phone && (
                          <button onClick={() => setShowSecondary(s => ({ ...s, [r.id]: !s[r.id] }))}
                            className={`h-6 px-2 text-[9px] font-bold uppercase rounded border transition-all cursor-pointer ${showSecondary[r.id] ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}>
                            {showSecondary[r.id] ? '← Pri' : '2nd →'}
                          </button>
                        )}
                        <button onClick={() => handleCopy(r.id, activePhone!)}
                          className="h-6 px-2 text-[9px] font-bold uppercase text-slate-500 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
                          {copiedId === r.id ? '✓' : 'Copy'}
                        </button>
                        <a href={`tel:${activePhone}`} className="h-6 w-6 flex items-center justify-center bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
                          <Phone size={11} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Bar with Page Size Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span>Showing {filteredRows.length > 0 ? (currentPage - 1) * effectivePageSize + 1 : 0} to {Math.min(currentPage * effectivePageSize, filteredRows.length)} of {filteredRows.length} records</span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] font-bold text-slate-400">Per page:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-bold outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>All Records</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map(pageNum => (
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
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Administrative Notes Overlay Modal */}
      {notesModalContent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-[#E8752D] dark:text-[#FB923C] rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">Administrative Pass Notes</h3>
                  <p className="text-xs font-semibold text-slate-400">{notesModalContent.title}</p>
                </div>
              </div>
              <button
                onClick={() => setNotesModalContent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
              {notesModalContent.notes}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setNotesModalContent(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
