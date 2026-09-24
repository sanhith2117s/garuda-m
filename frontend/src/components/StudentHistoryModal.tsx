import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';
import { X, Clock, ShieldCheck, AlertTriangle, Phone, FileText, Calendar, CheckCircle2, User, RefreshCw } from 'lucide-react';

interface StudentHistoryModalProps {
  studentRollOrId: string | number | null;
  onClose: () => void;
}

export default function StudentHistoryModal({ studentRollOrId, onClose }: StudentHistoryModalProps) {
  const token = useAuthStore(s => s.token);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'outpasses' | 'lunch' | 'latecomers' | 'custom'>('outpasses');

  useEffect(() => {
    if (!studentRollOrId) return;
    setLoading(true);
    setError(null);
    axios.get(`/api/admin/directory/student-history/${encodeURIComponent(studentRollOrId)}`, { headers })
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load student history details.'))
      .finally(() => setLoading(false));
  }, [studentRollOrId, token]);

  if (!studentRollOrId) return null;

  const student = data?.student;
  const passSummary = data?.pass_summary;
  const leaveRequests = data?.leave_requests || [];
  const latecomers = data?.latecomers || [];
  const customPasses = data?.custom_passes || [];

  // Sort outpasses Latest to Oldest
  const sortedLeaveRequests = [...leaveRequests].sort((a: any, b: any) => {
    const timeA = new Date(a.created_at || a.approved_at || 0).getTime();
    const timeB = new Date(b.created_at || b.approved_at || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 shadow-md bg-white/10 shrink-0">
              {student ? (
                <img
                  src={`/api/static/photos/${student.roll_number}.jpg`}
                  alt={student.full_name}
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=059669&color=fff&bold=true`; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  <User size={24} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-black tracking-tight text-white truncate">
                {student?.full_name || 'Student History'}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                <span className="font-mono bg-white/10 px-2.5 py-0.5 rounded-md font-bold text-amber-300 border border-white/10">
                  {student?.roll_number || studentRollOrId}
                </span>
                {student?.section_display && (
                  <span className="bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-md font-bold border border-indigo-400/30">
                    {student.section_display}
                  </span>
                )}
                {student?.college_code && (
                  <span className="bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-md font-bold border border-emerald-400/30">
                    {student.college_code}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs animate-pulse flex items-center justify-center gap-3">
            <RefreshCw className="animate-spin" size={18} /> Loading Student History Timeline...
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="mx-auto text-rose-500" size={32} />
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{error}</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* KPI Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Semester Outpasses</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {passSummary?.used_normal_passes || 0} / {passSummary?.max_normal_passes || 5}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">Regular Passes Used</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${passSummary?.limit_reached ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'}`}>
                  <ShieldCheck size={20} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Daily Pass Limit</p>
                  <p className={`text-base font-black mt-0.5 ${passSummary?.has_pass_today ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {passSummary?.has_pass_today ? '1 Pass Issued Today' : 'No Pass Today'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">Max 1 Pass / Day</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${passSummary?.has_pass_today ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'}`}>
                  <Calendar size={20} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Latecomer Strikes</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {latecomers.length} Strikes
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">Late Entries</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300 flex items-center justify-center">
                  <Clock size={20} />
                </div>
              </div>
            </div>

            {/* Parent Contact Info */}
            {student?.parent_phone && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Phone size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">Parent / Guardian Contact</span>
                    <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{student.parent_phone}</span>
                  </div>
                </div>
                <a
                  href={`tel:${student.parent_phone}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone size={13} /> Call Parent
                </a>
              </div>
            )}

            {/* History Category Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
              {[
                ['outpasses', `Outpasses (${sortedLeaveRequests.length})`],
                ['latecomers', `Latecomers (${latecomers.length})`],
                ['custom', `Custom Passes (${customPasses.length})`]
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`pb-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activeTab === key ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Outpasses List (Sorted Latest to Oldest) */}
            {activeTab === 'outpasses' && (
              <div className="space-y-3">
                {sortedLeaveRequests.length === 0 ? (
                  <p className="text-center py-8 text-xs font-medium text-slate-400 italic">No outpass records found for this student.</p>
                ) : (
                  sortedLeaveRequests.map((lr: any) => (
                    <div key={lr.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{lr.reason}</span>
                          {lr.is_emergency && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Emergency Pass
                            </span>
                          )}
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${lr.status === 'returned' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' : lr.status === 'exited' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {lr.status}
                          </span>
                        </div>
                        {lr.notes && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Notes: {lr.notes}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-semibold pt-1">
                          <span>Date: {lr.created_at ? lr.created_at.slice(0, 10) : '—'}</span>
                          {lr.approved_at && <span>Approved: {new Date(lr.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Latecomers List */}
            {activeTab === 'latecomers' && (
              <div className="space-y-3">
                {latecomers.length === 0 ? (
                  <p className="text-center py-8 text-xs font-medium text-slate-400 italic">No late entry strikes recorded.</p>
                ) : (
                  latecomers.map((lc: any) => (
                    <div key={lc.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">Late Entry Record</p>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">Time: {lc.scanned_at || lc.created_at}</p>
                      </div>
                      <span className="text-xs font-mono font-bold px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 rounded-lg">
                        Strike #{lc.strike_number || 1}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Custom Passes List */}
            {activeTab === 'custom' && (
              <div className="space-y-3">
                {customPasses.length === 0 ? (
                  <p className="text-center py-8 text-xs font-medium text-slate-400 italic">No custom pass assignments found.</p>
                ) : (
                  customPasses.map((cp: any) => (
                    <div key={cp.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">{cp.pass_type_name || 'Custom Event Pass'}</p>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">Issued: {cp.created_at ? cp.created_at.slice(0, 10) : '—'}</p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-lg">
                        {cp.status || 'Active'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
