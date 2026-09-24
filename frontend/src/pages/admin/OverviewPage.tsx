import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { ShieldCheck, Clock, UtensilsCrossed, AlertTriangle, Users, Key, Search, UserCheck, Plus, CheckCircle, XCircle, RefreshCw, LayoutDashboard, Send, FileText } from 'lucide-react';
import { fmtTime } from '../../utils/dateUtils';
import { showAlert, showConfirm } from '../../utils/modal';

interface ActivePass {
  id: number;
  student_name: string;
  roll_number: string;
  admn_no: string;
  reason: string;
  photo_url: string;
  approved_at: string;
  requested_at?: string;
  gate_activated: boolean;
  issued_by_role?: string;
  remarks?: string;
}

export default function OverviewPage() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [analytics, setAnalytics] = useState<any>(null);
  const [activePasses, setActivePasses] = useState<ActivePass[]>([]);
  const [mentorRequests, setMentorRequests] = useState<any[]>([]);
  const [emergencyPasses, setEmergencyPasses] = useState<any[]>([]);
  const [lateExceptions, setLateExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOverviewData = () => {
    setLoading(true);
    const colQuery = collegeId ? `?college_id=${collegeId}` : '';

    axios.get(`/api/gate/analytics${colQuery}`, { headers })
      .then(r => setAnalytics(r.data))
      .catch(() => {});

    axios.get(`/api/gate/active-passes${colQuery}`, { headers })
      .then(r => {
        const sorted = (r.data || []).sort((a: any, b: any) => {
          const timeA = new Date(a.approved_at || a.requested_at || 0).getTime();
          const timeB = new Date(b.approved_at || b.requested_at || 0).getTime();
          return timeB - timeA;
        });
        setActivePasses(sorted);
      })
      .catch(() => {});

    // Mentor fallback requests
    axios.get(`/api/admin/mentor-fallback-requests${colQuery}`, { headers })
      .then(r => setMentorRequests(r.data || []))
      .catch(() => {
        axios.get(`/api/gate/leave-requests${colQuery}`, { headers })
          .then(r => {
            const pending = (r.data || []).filter((item: any) => item.status === 'pending' || item.status === 'submitted');
            setMentorRequests(pending);
          })
          .catch(() => setMentorRequests([]));
      });

    // Late exceptions
    axios.get(`/api/admin/latecomers/exceptions${colQuery}`, { headers })
      .then(r => setLateExceptions(r.data || []))
      .catch(() => setLateExceptions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 15000);
    return () => clearInterval(interval);
  }, [collegeId]);

  const handleApproveMentorRequest = async (id: number, studentName: string) => {
    const confirmed = await showConfirm(
      'Approve Mentor Fallback Request',
      `Approve gate pass for '${studentName}'? This will activate the pass at the gate with a 3-hour exit window.`
    );
    if (!confirmed) return;

    try {
      await axios.post(`/api/admin/approve-mentor-request/${id}`, { decision: 'approve' }, { headers });
      showAlert('Success', `Pass approved and activated at gate for ${studentName}!`);
      fetchOverviewData();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to approve pass.');
    }
  };

  const handleRejectMentorRequest = async (id: number, studentName: string) => {
    const confirmed = await showConfirm('Reject Request', `Reject pass request for '${studentName}'?`);
    if (!confirmed) return;

    try {
      await axios.post(`/api/admin/approve-mentor-request/${id}`, { decision: 'reject' }, { headers });
      showAlert('Success', `Pass request for ${studentName} rejected.`);
      fetchOverviewData();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to reject request.');
    }
  };

  const handleRevokePass = async (id: number, studentName: string) => {
    const confirmed = await showConfirm('Revoke Pass', `Revoke active pass for '${studentName}'?`);
    if (!confirmed) return;

    try {
      await axios.post(`/api/gate/${id}/deactivate`, {}, { headers });
      showAlert('Success', `Active pass revoked for ${studentName}.`);
      fetchOverviewData();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to revoke pass.');
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="text-emerald-500" /> Action Required Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Central operational queue for Mentor fallback approvals, emergency pass monitoring, and active gate returns
          </p>
        </div>

        <button
          onClick={fetchOverviewData}
          className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Queue
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#162032] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mentor Approvals Pending</p>
            <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{mentorRequests.length}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
            <Send size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#162032] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active Outpasses</p>
            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
              {activePasses.length}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#162032] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Exited Gate Today</p>
            <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {analytics?.total_exited_today || activePasses.filter(p => !p.gate_activated).length || 0}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#162032] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Late-Entry Exceptions</p>
            <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{lateExceptions.length}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Section 1: Mentor Fallback Requests Queue (HOD Absent) */}
      <div className="bg-white dark:bg-[#162032] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="text-amber-500" size={18} /> Mentor Fallback Requests (HOD Unavailable)
          </h3>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {mentorRequests.length} Pending Approval
          </span>
        </div>

        {mentorRequests.length === 0 ? (
          <p className="text-center py-8 text-xs font-semibold text-slate-400 italic">No pending Mentor fallback requests at this time.</p>
        ) : (
          <div className="space-y-3">
            {mentorRequests.map((req: any) => (
              <div key={req.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{req.student_name}</span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{req.roll_number}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Submitted on behalf of HOD
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Reason: {req.reason} {req.notes ? `• Notes: ${req.notes}` : ''}</p>
                  <p className="text-[11px] text-slate-400 font-medium">Submitted by Section Mentor • Time: {req.requested_at ? req.requested_at.slice(0, 16) : 'Just now'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRejectMentorRequest(req.id, req.student_name)}
                    className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveMentorRequest(req.id, req.student_name)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Approve & Activate Gate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Active Passes & Unresolved Gate Returns (Latest to Oldest) */}
      <div className="bg-white dark:bg-[#162032] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={18} /> Active Passes & Gate Returns (Latest First)
          </h3>
          <span className="text-xs font-bold text-slate-400">{activePasses.length} Active Records</span>
        </div>

        {activePasses.length === 0 ? (
          <p className="text-center py-8 text-xs font-semibold text-slate-400 italic">No active outpasses at the gate.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {activePasses.map(p => (
              <div key={p.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                    <img
                      src={p.photo_url || `/api/static/photos/${p.roll_number}.jpg`}
                      alt={p.student_name}
                      className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.student_name)}&background=059669&color=fff`; }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{p.student_name}</span>
                      <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold">{p.roll_number}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{p.reason} • Approved: {p.approved_at ? p.approved_at.slice(11, 16) : '—'}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokePass(p.id, p.student_name)}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 cursor-pointer shrink-0"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
