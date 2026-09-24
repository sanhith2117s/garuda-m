import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';
import { showAlert } from '../utils/modal';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, BarChart3, Clock, ShieldCheck, ShieldOff, History, Search } from 'lucide-react';
import logo from '../assets/logo.png';
import CustomDatePicker from '../components/CustomDatePicker';

interface AnalyticsData {
  today: { total: number; exited: number; pending: number };
  week:  { total: number; exited: number; pending: number };
  month: { total: number; exited: number; pending: number };
  live:  { awaiting_activation: number; active_passes: number };
}
interface LeaveRow {
  id: number; student_name: string; roll_number: string;
  reason: string; notes?: string; status?: string;
  gate_activated?: boolean; approved_at?: string; requested_at: string;
}

type Tab = 'awaiting' | 'active' | 'history';
type Period = 'today' | 'week' | 'month';

const statusColor = (s: string) => {
  if (s === 'approved') return 'bg-green-100 text-green-700';
  if (s === 'rejected') return 'bg-red-100 text-red-700';
  if (s === 'exited') return 'bg-blue-100 text-blue-700';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
};
import { fmtDate } from '../utils/dateUtils';

export default function ScannerApp() {
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tab, setTab] = useState<Tab>('awaiting');
  const [period, setPeriod] = useState<Period>('today');
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [htnoFilter, setHtnoFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get('/api/gate/analytics', { headers });
      setAnalytics(res.data);
    } catch { /* silent */ }
  }, [token]);

  const fetchTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'awaiting') {
        const res = await axios.get('/api/gate/approved-leaves', { headers });
        setRows(res.data);
      } else if (tab === 'active') {
        const res = await axios.get('/api/gate/active-passes', { headers });
        setRows(res.data);
      } else {
        const params = new URLSearchParams();
        if (htnoFilter) params.set('htno', htnoFilter);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        const res = await axios.get(`/api/gate/history?${params}`, { headers });
        setRows(res.data);
      }
    } finally { setLoading(false); }
  }, [tab, token, htnoFilter, dateFrom, dateTo]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchTabData(); }, [fetchTabData]);

  const handleActivate = async (id: number) => {
    setActionLoading(id);
    try { await axios.post(`/api/gate/${id}/activate`, {}, { headers }); await fetchTabData(); await fetchAnalytics(); }
    catch (e: any) { showAlert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleDeactivate = async (id: number) => {
    setActionLoading(id);
    try { await axios.post(`/api/gate/${id}/deactivate`, {}, { headers }); await fetchTabData(); await fetchAnalytics(); }
    catch (e: any) { showAlert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const periodData = analytics?.[period];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-md shadow-blue-950/10 transform -rotate-3">
              <img src={logo} alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tighter text-[#0B1B4D] leading-none">GARUDA</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Gate Admin</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mt-1">Gate Pass Control</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#f3edfd] text-[#7e3af2] rounded-full flex items-center justify-center"><Users size={20} /></div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold rounded-xl text-sm transition-colors">
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        {/* ── ANALYTICS ── */}
        {analytics && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-gray-700"><BarChart3 size={18} className="text-[#7e3af2]" /> Analytics</div>
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1 text-xs font-semibold">
                {(['today', 'week', 'month'] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-md transition-all capitalize cursor-pointer ${
                      period === p
                        ? 'bg-[#7e3af2] text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[#7e3af2]">{periodData?.total ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Total Requests</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{periodData?.exited ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Students Exited</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{periodData?.pending ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Pending Approval</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TABS ── */}
        <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm p-1 gap-1">
          {([
            ['awaiting', `Awaiting Activation (${analytics?.live.awaiting_activation ?? 0})`, Clock],
            ['active',   `Active Passes (${analytics?.live.active_passes ?? 0})`, ShieldCheck],
            ['history',  'Full History', History],
          ] as [Tab, string, any][]).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                tab === key
                  ? key === 'active' ? 'bg-green-600 text-white shadow-sm' : 'bg-[#7e3af2] text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* ── INFO BANNERS ── */}
        {tab === 'awaiting' && (
          <div className="bg-blue-50 border border-blue-100 text-blue-700 px-5 py-3 rounded-xl text-sm">
            Click <strong>Activate Pass</strong> to allow the student's physical ID card QR to be scanned at the gate.
          </div>
        )}
        {tab === 'active' && (
          <div className="bg-green-50 border border-green-100 text-green-700 px-5 py-3 rounded-xl text-sm">
            These passes are live. Security will scan the student's physical ID card QR to mark exit.
          </div>
        )}

        {/* ── HISTORY FILTERS ── */}
        {tab === 'history' && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Search by Hall Ticket No.</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={htnoFilter} onChange={e => setHtnoFilter(e.target.value)} placeholder="e.g. 24BD1A050A"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#7e3af2] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">From</label>
              <CustomDatePicker
                value={dateFrom}
                onChange={val => {
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
              <label className="text-xs font-semibold text-gray-500 mb-1 block">To</label>
              <CustomDatePicker
                value={dateTo}
                onChange={setDateTo}
                min={dateFrom}
                placeholder="Select Date"
                className="w-40"
              />
            </div>
            <button onClick={fetchTabData} className="px-5 py-2 bg-[#7e3af2] text-white rounded-lg text-sm font-semibold hover:bg-[#6c2bd9] transition-colors">
              Search
            </button>
          </div>
        )}

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">{tab === 'awaiting' ? 'No leaves awaiting activation.' : tab === 'active' ? 'No active passes.' : 'No records found.'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map(req => (
              <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-gray-900">{req.student_name}</span>
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{req.roll_number}</span>
                    {req.status && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${statusColor(req.status)}`}>{req.status}</span>
                    )}
                    {req.gate_activated && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase">Gate Active</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 capitalize">{req.reason} Leave {req.notes ? `— ${req.notes}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requested: {fmtDate(req.requested_at)}
                    {req.approved_at ? ` · Approved: ${fmtDate(req.approved_at)}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {tab === 'awaiting' && (
                    <button disabled={actionLoading === req.id} onClick={() => handleActivate(req.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#7e3af2] text-white hover:bg-[#6c2bd9] font-semibold rounded-xl text-sm transition-colors disabled:opacity-50">
                      <ShieldCheck size={15} />{actionLoading === req.id ? '…' : 'Activate Pass'}
                    </button>
                  )}
                  {tab === 'active' && (
                    <button disabled={actionLoading === req.id} onClick={() => handleDeactivate(req.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50">
                      <ShieldOff size={15} />{actionLoading === req.id ? '…' : 'Revoke Pass'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
