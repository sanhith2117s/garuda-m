import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import CustomDatePicker from '../../components/CustomDatePicker';
import { showAlert, showConfirm } from '../../utils/modal';
import {
  Plus, Trash2, Tag, User, Clock, CheckCircle,
  XCircle, Search, CalendarDays, AlertTriangle, Loader2, RefreshCw, Info
} from 'lucide-react';

interface PassType {
  id: number;
  name: string;
  out_time: string;
  in_time: string;
  description?: string;
  created_at: string;
}

interface Assignment {
  id: number;
  student_name: string;
  roll_number: string;
  branch: string;
  section: string;
  semester: number;
  pass_type_id: number;
  pass_name: string;
  out_time: string;
  in_time: string;
  valid_from?: string;
  valid_to?: string;
  assigned_at: string;
  is_active: boolean;
}

type Tab = 'passes' | 'issue-history' | 'scan-history' | 'monitoring';

import { fmtDate as fmtDateTime } from '../../utils/dateUtils';

export default function CustomPassPage() {
  const token = useAuthStore(s => s.token);
  const userRole = useAuthStore(s => s.role);
  const collegeId = useAuthStore(s => s.collegeId);
  const h = { Authorization: `Bearer ${token}` };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayStr();

  const [tab, setTab] = useState<Tab>('passes');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Shared filter state ──────────────────────────────────────────────────────
  const [filterRoll, setFilterRoll] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  
  useEffect(() => { setCurrentPage(1); }, [tab, filterRoll, filterType]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'out' | 'returned' | 'not-returned'>('all');

  // ── Pass Types state ────────────────────────────────────────────────────────
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);

  // Create pass type form
  const [newName, setNewName] = useState('');
  const [newOutTime, setNewOutTime] = useState('12:30');
  const [newInTime, setNewInTime] = useState('13:00');
  const [newDesc, setNewDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Assign form
  const [rollInput, setRollInput] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [customOutTime, setCustomOutTime] = useState('12:30');
  const [customInTime, setCustomInTime] = useState('13:00');
  const [validFrom, setValidFrom] = useState(todayStr);
  const [validTo, setValidTo] = useState(todayStr);
  const [assignMsg, setAssignMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Debounced Roll Number Search ──────────────────────────────────────────────
  useEffect(() => {
    if (!rollInput.trim() || rollInput.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/admin/lunch/students-search?q=${encodeURIComponent(rollInput.trim())}`, { headers: h });
        setSuggestions(res.data);
        setShowSuggestions(res.data.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [rollInput]);

  // ── Content state ───────────────────────────────────────────────────────────
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const loadTypes = useCallback(async () => {
    if (!token) return;
    setTypesLoading(true);
    try {
      const colQuery = collegeId ? `?college_id=${collegeId}` : '';
      const res = await axios.get(`/api/admin/custom-passes/types${colQuery}`, { headers: { Authorization: `Bearer ${token}` } });
      setPassTypes(res.data || []);
      if (res.data && res.data.length > 0) {
        if (!selectedTypeId || !res.data.some((pt: any) => String(pt.id) === selectedTypeId)) {
          setSelectedTypeId(String(res.data[0].id));
          setCustomOutTime(res.data[0].out_time || '12:30');
          setCustomInTime(res.data[0].in_time || '13:00');
        }
      }
    } catch { /* ignore */ }
    setTypesLoading(false);
  }, [token, collegeId, selectedTypeId]);

  const fetchTabContent = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (collegeId) params.college_id = String(collegeId);
      if (filterRoll) params.roll_number = filterRoll.trim();
      if (filterType) params.pass_type_id = filterType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      if (tab === 'passes') {
        params.active_only = 'true';
        const res = await axios.get('/api/admin/custom-passes/assignments', { headers: h, params });
        setRows(res.data);
      } else if (tab === 'issue-history') {
        params.active_only = 'false';
        const res = await axios.get('/api/admin/custom-passes/assignments', { headers: h, params });
        setRows(res.data);
      } else if (tab === 'scan-history') {
        const res = await axios.get('/api/admin/custom-passes/scan-history', { headers: h, params });
        setRows(res.data);
      } else if (tab === 'monitoring') {
        const res = await axios.get('/api/admin/custom-passes/monitoring', { headers: h, params });
        setRows(res.data);
      }
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, [tab, filterRoll, filterType, dateFrom, dateTo]);

  useEffect(() => { loadTypes(); }, [loadTypes]);
  useEffect(() => { fetchTabContent(); }, [tab, filterType, dateFrom, dateTo, fetchTabContent]);

  const filteredRows = React.useMemo(() => {
    if (tab !== 'monitoring') return rows;
    return rows.filter(r => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'out' && r.status !== 'Out') return false;
        if (statusFilter === 'returned' && r.status !== 'Returned' && r.status !== 'Returned Late') return false;
        if (statusFilter === 'not-returned' && r.status !== 'Not Returned') return false;
      }
      return true;
    });
  }, [rows, tab, statusFilter]);

  // ── Create pass type ────────────────────────────────────────────────────────
  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    setCreateMsg(null);
    try {
      await axios.post('/api/admin/custom-passes/types',
        {
          name: newName.trim(),
          out_time: newOutTime,
          in_time: newInTime,
          description: newDesc || null,
          college_id: collegeId || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCreateMsg({ ok: true, text: `"${newName}" created!` });
      setNewName(''); setNewDesc('');
      loadTypes();
    } catch (err: any) {
      setCreateMsg({ ok: false, text: err.response?.data?.detail || 'Failed to create pass type' });
    }
    setCreateLoading(false);
  };

  // ── Delete pass type ────────────────────────────────────────────────────────
  const handleDeleteType = async (pt: PassType) => {
    const ok = await showConfirm('Delete Pass Type', `Delete "${pt.name}"? All student assignments will be revoked.`);
    if (!ok) return;
    try {
      await axios.delete(`/api/admin/custom-passes/types/${pt.id}`, { headers: h });
      loadTypes();
      fetchTabContent();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to delete');
    }
  };

  // ── Assign pass ─────────────────────────────────────────────────────────────
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollInput.trim() || !selectedTypeId) return;
    setAssigning(true); setAssignMsg(null);
    try {
      await axios.post('/api/admin/custom-passes/assignments',
        {
          roll_number: rollInput.trim(),
          pass_type_id: parseInt(selectedTypeId),
          out_time: customOutTime,
          in_time: customInTime,
          valid_from: validFrom || todayStr,
          valid_to: validTo || validFrom || todayStr,
        },
        { headers: h }
      );
      const pt = passTypes.find(p => p.id === parseInt(selectedTypeId));
      setAssignMsg({ ok: true, text: `"${pt?.name}" assigned to ${rollInput}!` });
      setRollInput('');
      fetchTabContent();
    } catch (err: any) {
      setAssignMsg({ ok: false, text: err.response?.data?.detail || 'Failed to assign pass' });
    }
    setAssigning(false);
  };

  // ── Revoke assignment ───────────────────────────────────────────────────────
  const handleRevoke = async (id: number, studentName: string) => {
    const ok = await showConfirm('Revoke Pass', `Revoke this pass from ${studentName}?`);
    if (!ok) return;
    try {
      await axios.delete(`/api/admin/custom-passes/assignments/${id}`, { headers: h });
      fetchTabContent();
    } catch { showAlert('Error', 'Failed to revoke'); }
  };

  const selectedTypeInfo = passTypes.find(p => p.id === parseInt(selectedTypeId));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Tag className="text-[#E8752D] dark:text-[#FB923C]" size={22} /> CUSTOM PASS HUB
          </h2>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-1.5 shadow-inner border border-slate-200/80 dark:border-slate-800 w-max shrink-0">
          {([
            ['passes', 'Active Passes'],
            ['issue-history', 'Issue History'],
            ['scan-history', 'Scan History'],
            ['monitoring', 'Pass Monitoring']
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setTab(k); setRows([]); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === k
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Date-Range Search Section */}
      <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-6 flex flex-wrap gap-4 items-end">
        <div className="flex-[2] min-w-[280px]">
          <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider mb-2 block">Search Student</label>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search Roll No or Name..."
              value={filterRoll}
              onChange={e => setFilterRoll(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        <div className="min-w-[160px]">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Pass Type</label>
          <CustomSelect
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: '', label: 'All Pass Types' },
              ...passTypes.map(pt => ({ value: String(pt.id), label: pt.name }))
            ]}
            placeholder="All Pass Types"
          />
        </div>

        {(tab === 'scan-history' || tab === 'monitoring') && (
          <>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Date From</label>
              <CustomDatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="Today"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Date To</label>
              <CustomDatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="Today"
              />
            </div>
          </>
        )}

        {tab === 'monitoring' && (
          <div className="min-w-[140px]">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Status Filter</label>
            <CustomSelect
              value={statusFilter}
              onChange={val => setStatusFilter(val as any)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'out', label: 'Currently Out' },
                { value: 'returned', label: 'Returned' },
                { value: 'not-returned', label: 'Not Returned' },
              ]}
              placeholder="All Statuses"
            />
          </div>
        )}

        <button
          onClick={fetchTabContent}
          className="h-10 px-5 bg-[#E8752D] hover:bg-[#D96622] text-white border border-[#E8752D] rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/20"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {/* Main Tab Switch Area */}
      {tab === 'passes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Form 1: Create Pass Type */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-7">
            <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Plus size={15} className="text-[#E8752D] dark:text-[#FB923C]" /> Create Custom Pass Type
            </h3>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Pass Name *</label>
                <input
                  type="text" required value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Namaz Pass, Club Pass, Library Pass"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#7e3af2] placeholder:font-normal placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Exit Window Opens *</label>
                  <input type="time" required value={newOutTime}
                    onChange={e => setNewOutTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Return Cutoff Window *</label>
                  <input type="time" required value={newInTime}
                    onChange={e => setNewInTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Description (optional)</label>
                <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Brief note about this custom pass"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-slate-100 outline-none placeholder:font-normal placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              </div>

              {createMsg && (
                <div className={`flex items-center gap-2 text-[12px] font-bold px-4 py-3 rounded-xl ${
                  createMsg.ok ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455 border border-rose-200 dark:border-rose-900/30'
                }`}>
                  {createMsg.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {createMsg.text}
                </div>
              )}

              <button type="submit" disabled={createLoading}
                className="w-full py-3.5 bg-[#E8752D] hover:bg-[#D96622] text-white font-black text-[10px] uppercase tracking-widest rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-600/20"
              >
                {createLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Pass Type
              </button>
            </form>
          </div>

          {/* Form 2: Assign Pass to Student */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-7">
            <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={15} className="text-[#E8752D] dark:text-[#FB923C]" /> Assign Pass to Student
            </h3>
            <form onSubmit={handleAssign} className="space-y-4">
              <div className="relative">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Roll Number *</label>
                <input type="text" required value={rollInput}
                  onChange={e => setRollInput(e.target.value.toUpperCase())}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Type roll number or search name..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] font-bold uppercase text-slate-800 dark:text-slate-100 outline-none placeholder:font-normal placeholder:normal-case placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />

                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                    {suggestions.map((s: any) => (
                      <button
                        type="button"
                        key={s.id || s.roll_number}
                        onClick={() => {
                          setRollInput(s.roll_number);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all rounded-xl flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#E8752D] transition-colors">{s.full_name}</p>
                          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">{s.roll_number} {s.branch && `• ${s.branch}-${s.section}`}</p>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#E8752D] bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-200/60 dark:border-orange-900/40">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Pass Type *</label>
                <CustomSelect
                  value={selectedTypeId}
                  onChange={(val: string) => {
                    setSelectedTypeId(val);
                    const pt = passTypes.find(p => String(p.id) === val);
                    if (pt) {
                      setCustomOutTime(pt.out_time);
                      setCustomInTime(pt.in_time);
                    }
                  }}
                  options={[
                    { value: '', label: '— Select Custom Pass Type —' },
                    ...passTypes.map(pt => ({ value: String(pt.id), label: `${pt.name} (${pt.out_time} → ${pt.in_time})` }))
                  ]}
                  placeholder="— Select Custom Pass Type —"
                  required
                />
              </div>

              {selectedTypeInfo && (
                <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/30 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-[#E8752D] uppercase tracking-wider">Customize Pass Timing & Validity</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Custom Exit Time</label>
                      <input 
                        type="time" 
                        value={customOutTime} 
                        onChange={e => setCustomOutTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Custom Return Cutoff</label>
                      <input 
                        type="time" 
                        value={customInTime} 
                        onChange={e => setCustomInTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Valid From (Default: Today)</label>
                  <CustomDatePicker
                    value={validFrom}
                    onChange={(val: string) => {
                      setValidFrom(val);
                      if (validTo && validTo < val) setValidTo(val);
                    }}
                    min={todayStr}
                    placeholder="Today"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Valid To (Default: 1 Day)</label>
                  <CustomDatePicker
                    value={validTo}
                    onChange={setValidTo}
                    min={validFrom || todayStr}
                    placeholder="Today (1 Day)"
                  />
                </div>
              </div>

              {assignMsg && (
                <div className={`flex items-center gap-2 text-[12px] font-bold px-4 py-3 rounded-xl ${
                  assignMsg.ok ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455 border border-rose-200 dark:border-rose-900/30'
                }`}>
                  {assignMsg.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {assignMsg.text}
                </div>
              )}

              <button type="submit" disabled={assigning || !selectedTypeId}
                className="w-full py-3.5 bg-[#E8752D] hover:bg-[#D96622] text-white font-black text-[10px] uppercase tracking-widest rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-600/20"
              >
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Assign Pass
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pass Types List (Show only on Passes tab) */}
      {tab === 'passes' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-7">
          <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Tag size={15} className="text-indigo-600 dark:text-indigo-400" /> Active Custom Pass Types ({passTypes.length})
          </h3>
          {typesLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
          ) : passTypes.length === 0 ? (
            <div className="text-center py-10">
              <Tag size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-[12px] font-bold text-slate-400">No custom pass types created yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {passTypes.map(pt => (
                <div key={pt.id} className="group bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-indigo-50/10 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                        <Tag size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 leading-tight">{pt.name}</p>
                          {(pt as any).college_code && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                              {(pt as any).college_code}
                            </span>
                          )}
                        </div>
                        {pt.description && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{pt.description}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteType(pt)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 dark:hover:text-rose-455 transition-all cursor-pointer"
                      title="Delete pass type"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5">
                      <Clock size={11} className="text-emerald-500" />
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{pt.out_time}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700 text-xs">→</span>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5">
                      <Clock size={11} className="text-rose-400" />
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{pt.in_time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Table Content for all tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            {tab === 'passes' && 'Active Pass Assignments'}
            {tab === 'issue-history' && 'Custom Pass Issuance History'}
            {tab === 'scan-history' && 'Custom Pass Activity Scans'}
            {tab === 'monitoring' && 'Custom Pass Presence Monitoring'}
            {` (${filteredRows.length})`}
          </h3>
        </div>



        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300 dark:text-slate-700" /></div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Search size={36} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
            <p className="text-[12px] font-bold text-slate-400 dark:text-slate-500">No records found matching filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850">
                  {tab === 'passes' && ['Student', 'College', 'Roll No.', 'Branch / Sec', 'Pass Type', 'Allowed Window', 'Valid Range', 'Action'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-widest">{h}</th>
                  ))}
                  {tab === 'issue-history' && ['Student', 'College', 'Roll No.', 'Branch / Sec', 'Pass Type', 'Allowed Window', 'Valid Range', 'Status', 'Assigned At'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-widest">{h}</th>
                  ))}
                  {tab === 'scan-history' && ['Student', 'College', 'Roll No.', 'Branch / Sec', 'Pass Type', 'Event', 'Scanned Time'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-widest">{h}</th>
                  ))}
                  {tab === 'monitoring' && ['Student', 'College', 'Roll No.', 'Branch / Sec', 'Pass Name', 'Date', 'Exit Scan', 'Entry Scan', 'Return Window', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                
                {/* 1. Passes Tab Rows */}
                {tab === 'passes' && filteredRows.map((a: Assignment) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-200">{a.student_name}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {a.college_code || (a.roll_number && (a.roll_number.includes('NG') || a.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{a.roll_number}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{a.branch}-{a.section} / Sem {a.semester}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-[#E8752D] dark:text-[#FB923C] border border-amber-200 dark:border-amber-900/40 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase">
                        <Tag size={10} /> {a.pass_name}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="text-emerald-600 dark:text-emerald-400">{a.out_time}</span>
                      <span className="text-slate-300 dark:text-slate-700 mx-1">→</span>
                      <span className="text-rose-500 dark:text-rose-455">{a.in_time}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {a.valid_from || a.valid_to ? (
                        <span className="flex items-center gap-1"><CalendarDays size={11} /> {a.valid_from || '—'} to {a.valid_to || '∞'}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 italic">No expiry</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => handleRevoke(a.id, a.student_name)}
                        className="text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-455 transition-colors cursor-pointer" title="Revoke Pass">
                        <XCircle size={17} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* 2. Issue History Tab Rows */}
                {tab === 'issue-history' && filteredRows.map((a: Assignment) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-200">{a.student_name}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {a.college_code || (a.roll_number && (a.roll_number.includes('NG') || a.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{a.roll_number}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{a.branch}-{a.section} / Sem {a.semester}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-[#E8752D] dark:text-[#FB923C] border border-amber-200 dark:border-amber-900/40 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase">
                        <Tag size={10} /> {a.pass_name}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="text-emerald-600 dark:text-emerald-400">{a.out_time}</span>
                      <span className="text-slate-300 dark:text-slate-700 mx-1">→</span>
                      <span className="text-rose-500 dark:text-rose-455">{a.in_time}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {a.valid_from || a.valid_to ? (
                        <span className="flex items-center gap-1"><CalendarDays size={11} /> {a.valid_from || '—'} to {a.valid_to || '∞'}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 italic">No expiry</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {a.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-850 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-slate-400 dark:text-slate-500">{fmtDateTime(a.assigned_at)}</td>
                  </tr>
                ))}

                {/* 3. Scan History Tab Rows */}
                {tab === 'scan-history' && filteredRows.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-200">{s.student_name}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {s.college_code || (s.roll_number && (s.roll_number.includes('NG') || s.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{s.roll_number}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{s.branch}-{s.section} / Sem {s.semester}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-[#E8752D] dark:text-[#FB923C] border border-amber-200 dark:border-amber-900/40 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase">
                        <Tag size={10} /> {s.pass_name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {s.scan_type === 'out' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase">
                          Exit allowed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase">
                          Entry allowed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">{fmtDateTime(s.scanned_at)}</td>
                  </tr>
                ))}

                {/* 4. Monitoring Tab Rows */}
                {tab === 'monitoring' && filteredRows.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-200">{m.student_name}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {m.college_code || (m.roll_number && (m.roll_number.includes('NG') || m.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{m.roll_number}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{m.branch}-{m.section} / Sem {m.semester}</td>
                    <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">{m.pass_name}</td>
                    <td className="px-5 py-4 font-mono text-[10px] text-slate-500 dark:text-slate-500">{m.date}</td>
                    <td className="px-5 py-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">{m.out_time ? fmtDateTime(m.out_time).split(',')[1]?.trim() : '—'}</td>
                    <td className="px-5 py-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{m.in_time ? fmtDateTime(m.in_time).split(',')[1]?.trim() : '—'}</td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400 dark:text-slate-550">{m.window_in}</td>
                    <td className="px-5 py-4">
                      {m.status === 'Out' && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase">
                          Away
                        </span>
                      )}
                      {m.status === 'Returned' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-450 border border-emerald-150 dark:border-emerald-900/30 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase">
                          Returned
                        </span>
                      )}
                      {m.status === 'Returned Late' && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase">
                          Returned Late
                        </span>
                      )}
                      {m.status === 'Not Returned' && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 px-2.5 py-1 rounded-lg font-black text-[9px] uppercase animate-pulse">
                          Not Returned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
