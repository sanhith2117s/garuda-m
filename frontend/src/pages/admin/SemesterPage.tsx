import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomDatePicker from '../../components/CustomDatePicker';
import { Settings, Users, ArrowRight, Power, PowerOff, ChevronDown, ChevronUp, GraduationCap, Clock, ShieldCheck, Layers, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { showConfirm } from '../../utils/modal';
import { toast } from '../../utils/toast';

interface Semester {
  id: number | null; semester_number: number; is_active: boolean;
  start_date?: string; end_date?: string; late_comer_limit: number; late_comer_cutoff: string;
  max_normal_passes?: number;
  lunch_out_start: string; lunch_out_end: string;
  lunch_in_start: string; lunch_in_end: string;
  both_approvals_required: boolean;
  student_count: number;
}

const yearGroups = [
  { year: 1, title: '1st Year', badge: 'Freshers', sems: [1, 2], color: 'from-blue-600/20 to-indigo-600/10 border-blue-500/30' },
  { year: 2, title: '2nd Year', badge: 'Sophs', sems: [3, 4], color: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30' },
  { year: 3, title: '3rd Year', badge: 'Juniors', sems: [5, 6], color: 'from-purple-600/20 to-indigo-600/10 border-purple-500/30' },
  { year: 4, title: '4th Year', badge: 'Grads', sems: [7, 8], color: 'from-amber-600/20 to-orange-600/10 border-amber-500/30' }
];

export default function SemesterPage() {
  const token = useAuthStore(s => s.token);
  const userRole = useAuthStore(s => s.role);
  const contextCollegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [colleges, setColleges] = useState<any[]>([]);
  const [activeCollegeId, setActiveCollegeId] = useState<number | null>(contextCollegeId || null);

  const [activeSems, setActiveSems] = useState<Semester[]>([]);
  const [allSems, setAllSems] = useState<Semester[]>([]);
  const [editing, setEditing] = useState<Semester | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [msg, setMsg] = useState('');
  const [activating, setActivating] = useState<number | null>(null);
  const [selectedSemNum, setSelectedSemNum] = useState<number>(3);

  // Fetch colleges if super_admin
  useEffect(() => {
    if (userRole === 'super_admin') {
      axios.get('/api/admin/colleges', { headers }).then(r => {
        setColleges(r.data);
        if (r.data.length > 0 && !activeCollegeId) {
          setActiveCollegeId(r.data[0].id);
        }
      }).catch(() => { });
    } else if (contextCollegeId) {
      setActiveCollegeId(contextCollegeId);
    }
  }, [userRole, contextCollegeId]);

  const effectiveCollegeId = activeCollegeId || contextCollegeId;
  const colQuery = effectiveCollegeId ? `&college_id=${effectiveCollegeId}` : '';

  const loadActive = () => {
    return axios.get(`/api/admin/semesters?active_only=true${colQuery}`, { headers }).then(r => {
      setActiveSems(r.data);
      if (r.data.length > 0 && !r.data.find((s: Semester) => s.semester_number === selectedSemNum)) {
        setSelectedSemNum(r.data[0].semester_number);
      }
    }).catch(() => { });
  };

  const loadAll = () => {
    return axios.get(`/api/admin/semesters?active_only=false${colQuery}`, { headers }).then(r => {
      setAllSems(r.data);
    }).catch(() => { });
  };

  useEffect(() => {
    loadActive();
    loadAll();
  }, [effectiveCollegeId]);

  useEffect(() => {
    if (showManage) loadAll();
  }, [showManage, effectiveCollegeId]);

  const flash = (m: string) => {
    const clean = m.replace(/^[✅❌⚠️ℹ️]\s*/, '');
    if (m.startsWith('✅')) toast.success(clean);
    else toast.error(clean);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    try {
      await axios.patch(`/api/admin/semesters/${editing.id}`, editing, { headers });
      flash('✅ Semester updated!'); setEditing(null); loadActive(); loadAll();
    } catch (e: any) { flash('❌ ' + (e.response?.data?.detail || 'Update failed')); }
  };

  const [promoteTarget, setPromoteTarget] = useState<Semester | null>(null);
  const [promoteForm, setPromoteForm] = useState({
    start_date: '',
    end_date: '',
    late_comer_limit: 5,
    late_comer_cutoff: '11:00',
    lunch_out_start: '12:30',
    lunch_out_end: '13:00',
    lunch_in_start: '13:00',
    lunch_in_end: '13:30',
    both_approvals_required: false
  });

  const handlePromote = (sem: Semester) => {
    setPromoteTarget(sem);
    const nextSemObj = allSems.find(s => s.semester_number === sem.semester_number + 1);
    setPromoteForm({
      start_date: nextSemObj?.start_date || sem.start_date || '',
      end_date: nextSemObj?.end_date || sem.end_date || '',
      late_comer_limit: nextSemObj?.late_comer_limit ?? sem.late_comer_limit ?? 5,
      late_comer_cutoff: nextSemObj?.late_comer_cutoff || sem.late_comer_cutoff || '11:00',
      lunch_out_start: nextSemObj?.lunch_out_start || sem.lunch_out_start || '12:30',
      lunch_out_end: nextSemObj?.lunch_out_end || sem.lunch_out_end || '13:00',
      lunch_in_start: nextSemObj?.lunch_in_start || sem.lunch_in_start || '13:00',
      lunch_in_end: nextSemObj?.lunch_in_end || sem.lunch_in_end || '13:30',
      both_approvals_required: nextSemObj?.both_approvals_required ?? sem.both_approvals_required ?? false
    });
  };

  const confirmPromoteBatch = async () => {
    if (!promoteTarget) return;
    const sem = promoteTarget;
    setPromoteTarget(null);
    try {
      const r = await axios.post(`/api/admin/semesters/${sem.id}/promote`, promoteForm, { headers });
      flash('✅ ' + r.data.message); loadActive(); loadAll();
    } catch (e: any) { flash('❌ ' + (e.response?.data?.detail || 'Promote failed')); }
  };

  const handleActivate = async (semNum: number) => {
    setActivating(semNum);
    try {
      const endpoint = `/api/admin/semesters${effectiveCollegeId ? `?college_id=${effectiveCollegeId}` : ''}`;
      await axios.post(endpoint, { semester_number: semNum }, { headers });
      flash(`✅ Semester ${semNum} activated! You can now enroll students.`);
      loadActive(); loadAll();
    } catch (e: any) { flash('❌ ' + (e.response?.data?.detail || 'Activation failed')); }
    finally { setActivating(null); }
  };

  const handleDeactivate = async (sem: Semester) => {
    if (sem.student_count > 0) {
      flash(`❌ Cannot deactivate — ${sem.student_count} students are still enrolled in Semester ${sem.semester_number}.`);
      return;
    }
    if (!(await showConfirm('Deactivate Semester', `Deactivate Semester ${sem.semester_number}? It will be hidden from all dropdowns.`))) return;
    try {
      await axios.patch(`/api/admin/semesters/${sem.id}`, { is_active: false }, { headers });
      flash(`✅ Semester ${sem.semester_number} deactivated.`); loadActive(); loadAll();
    } catch (e: any) { flash('❌ ' + (e.response?.data?.detail || 'Failed')); }
  };

  const selectedSem = allSems.find(s => s.semester_number === selectedSemNum) || activeSems.find(s => s.semester_number === selectedSemNum);
  const totalEnrolled = activeSems.reduce((acc, s) => acc + (s.student_count || 0), 0);

  const activeCollegeObj = colleges.find(c => c.id === effectiveCollegeId);

  const inputCls = "bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 transition-all w-full font-medium";

  return (
    <div className="space-y-6">


      {/* Super Admin College Selector Tabs */}
      {userRole === 'super_admin' && colleges.length > 0 && (
        <div className="bg-white dark:bg-[#162032] p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 shrink-0">
            Select College:
          </span>
          {colleges.map((col: any) => {
            const isTabActive = effectiveCollegeId === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveCollegeId(col.id)}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-2 ${isTabActive
                  ? 'bg-[#E8752D] text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                  }`}
              >
                <GraduationCap size={14} />
                {col.name} ({col.code})
              </button>
            );
          })}
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-slate-900 dark:text-white font-extrabold text-xl tracking-tight">Semester Management</h2>
              {activeCollegeObj && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {activeCollegeObj.code}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
              4-Year Degree Stream • {activeSems.length} active semesters • {totalEnrolled} total enrolled students
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowManage(!showManage)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <Layers size={15} />
          Manage Slots (1–8)
          {showManage ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* ── 4-YEAR ACADEMIC PIPELINE HORIZONTAL RIBBON ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {yearGroups.map(group => {
          const groupSems = allSems.filter(s => group.sems.includes(s.semester_number));
          const groupStudents = groupSems.reduce((acc, s) => acc + (s.student_count || 0), 0);
          const isYearActive = groupSems.some(s => s.is_active);

          return (
            <div
              key={group.year}
              className={`bg-gradient-to-br ${group.color} bg-white dark:bg-[#162032] rounded-3xl p-5 border shadow-sm transition-all duration-300 relative overflow-hidden`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-0.5">{group.badge}</span>
                  <h3 className="text-slate-900 dark:text-white font-black text-lg">{group.title}</h3>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isYearActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                  {isYearActive ? `${groupStudents} Enrolled` : 'Off'}
                </span>
              </div>

              {/* Semester Selector Pills */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                {group.sems.map(semNum => {
                  const semData = allSems.find(s => s.semester_number === semNum);
                  const isSelected = selectedSemNum === semNum;
                  const isActive = semData?.is_active;

                  return (
                    <button
                      key={semNum}
                      onClick={() => setSelectedSemNum(semNum)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/40'
                        : isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700'
                          : 'bg-slate-50 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-800'
                        }`}
                    >
                      <span>Sem {semNum}</span>
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ALL 8 SLOTS MANAGER DROPDOWN PANEL ────────────────────────────────────────── */}
      {showManage && (
        <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-6 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-start gap-4 mb-6">
            <div>
              <h3 className="text-slate-900 dark:text-white font-extrabold text-lg tracking-tight">System Semester Slots (1–8)</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">Activate a semester to make it visible across the system and allow student enrollment.</p>
            </div>
            {allSems.find(s => s.semester_number === 1 && !s.is_active) && (
              <button
                onClick={() => handleActivate(1)}
                disabled={activating === 1}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-60 ml-auto cursor-pointer"
              >
                <GraduationCap size={16} />
                {activating === 1 ? 'Activating…' : 'New Batch Intake (Activate Sem 1)'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {allSems.map(sem => (
              <div key={sem.semester_number}
                className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${sem.is_active
                  ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">Semester</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{sem.semester_number}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sem.is_active
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}>
                    {sem.is_active ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <Users size={13} className="text-slate-400" />
                  {sem.student_count} students
                </div>
                {sem.is_active ? (
                  <button
                    onClick={() => sem.id && handleDeactivate(sem)}
                    className="text-xs font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
                  >
                    <PowerOff size={13} /> Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(sem.semester_number)}
                    disabled={activating === sem.semester_number}
                    className="text-xs font-bold py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer mt-auto"
                  >
                    <Power size={13} /> {activating === sem.semester_number ? '…' : 'Activate'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MASTER PARAMETER INSPECTOR FULL WIDTH CARD ────────────────── */}
      {selectedSem ? (
        <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-md p-7 space-y-6 relative overflow-hidden">

          {/* Header & Status Bar */}
          <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-slate-900 dark:text-white">Semester {selectedSem.semester_number}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${selectedSem.is_active
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                {selectedSem.is_active ? 'ACTIVE' : 'INACTIVE / OFF'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {selectedSem.is_active ? (
                <>
                  <button
                    onClick={() => setEditing(selectedSem)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    <Settings size={15} /> Edit Configuration
                  </button>

                  {selectedSem.semester_number <= 8 && (
                    <button
                      onClick={() => handlePromote(selectedSem)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-extrabold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                    >
                      {selectedSem.semester_number === 8 ? 'Graduate Students' : 'Promote Batch'} <ArrowRight size={15} />
                    </button>
                  )}
                </>
              ) : (
                <span className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold border border-slate-200 dark:border-slate-700 select-none">
                  Read-Only (Inactive Semester)
                </span>
              )}
            </div>
          </div>

          {/* Parameters Inspection Grid (3 Sub-Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Sub-Card 1: Enrolled & Schedule */}
            <div className="bg-slate-50/80 dark:bg-[#0c1220] p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                <Users size={16} /> BATCH ENROLLMENT & SCHEDULE
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Enrolled Students</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">{selectedSem.student_count}</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Academic Duration</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedSem.start_date ? `${selectedSem.start_date} → ${selectedSem.end_date || 'Ongoing'}` : 'Not configured'}
                </p>
              </div>
            </div>

            {/* Sub-Card 2: Latecomer Audit & Approvals */}
            <div className="bg-slate-50/80 dark:bg-[#0c1220] p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                <Clock size={16} /> LATECOMER AUDIT & APPROVALS
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Late Entry Limit:</span>
                <span className="font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-3 py-1 rounded-lg text-xs">{selectedSem.late_comer_limit} Entries</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Late Cutoff Time:</span>
                <span className="font-bold font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 px-3 py-1 rounded-lg text-xs">{selectedSem.late_comer_cutoff || '11:00'} IST</span>
              </div>
            </div>

            {/* Sub-Card 3: Lunch Out/In Gate Timings */}
            <div className="bg-slate-50/80 dark:bg-[#0c1220] p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                <ShieldCheck size={16} /> GATE PASS LUNCH TIMINGS
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Lunch Out Window:</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{selectedSem.lunch_out_start} – {selectedSem.lunch_out_end}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Lunch Return Window:</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{selectedSem.lunch_in_start} – {selectedSem.lunch_in_end}</span>
              </div>
            </div>

          </div>

        </div>
      ) : null}

      {/* Edit Configuration Centered Glassmorphism Modal Pop-Up */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdate}
            className="bg-white dark:bg-[#162032] rounded-3xl border border-indigo-200 dark:border-indigo-800/60 shadow-2xl p-7 max-w-2xl w-full space-y-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Settings size={22} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-slate-900 dark:text-white font-extrabold text-lg">Edit Semester {editing.semester_number} Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Start Date</label>
                <CustomDatePicker
                  value={editing.start_date || ''}
                  onChange={val => setEditing(p => {
                    if (!p) return p;
                    const newEndDate = p.end_date && p.end_date < val ? val : p.end_date;
                    return { ...p, start_date: val, end_date: newEndDate };
                  })}
                  placeholder="Select Date"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">End Date</label>
                <CustomDatePicker
                  value={editing.end_date || ''}
                  onChange={val => setEditing(p => p ? { ...p, end_date: val } : p)}
                  min={editing.start_date}
                  placeholder="Select Date"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Max Normal Passes Quota</label>
                <input type="number" min="1" value={editing.max_normal_passes ?? 5} onChange={e => setEditing(p => p ? { ...p, max_normal_passes: Number(e.target.value) } : p)} className={inputCls} placeholder="e.g. 5" />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Late Comer Limit</label>
                <input type="number" min="1" value={editing.late_comer_limit} onChange={e => setEditing(p => p ? { ...p, late_comer_limit: Number(e.target.value) } : p)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Late Entry Cutoff Time</label>
                <input type="time" value={editing.late_comer_cutoff || '11:00'} onChange={e => setEditing(p => p ? { ...p, late_comer_cutoff: e.target.value } : p)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Lunch Out Start</label>
                <input value={editing.lunch_out_start} onChange={e => setEditing(p => p ? { ...p, lunch_out_start: e.target.value } : p)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Lunch Out End</label>
                <input value={editing.lunch_out_end} onChange={e => setEditing(p => p ? { ...p, lunch_out_end: e.target.value } : p)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Lunch In Start</label>
                <input value={editing.lunch_in_start} onChange={e => setEditing(p => p ? { ...p, lunch_in_start: e.target.value } : p)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-300 font-bold mb-2 block uppercase tracking-wider">Lunch In End</label>
                <input value={editing.lunch_in_end} onChange={e => setEditing(p => p ? { ...p, lunch_in_end: e.target.value } : p)} className={inputCls} />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-colors cursor-pointer">Save Changes</button>
              <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Feature 2: Rich Batch Promotion Confirmation & Target Configuration Modal */}
      {promoteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-[#E8752D] flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white font-black text-lg">
                    {promoteTarget.semester_number === 8 ? 'Graduate Students Batch' : 'Promote Batch & Term Setup'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Configure details for next academic term</p>
                </div>
              </div>
              <button onClick={() => setPromoteTarget(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Current Batch</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">Semester {promoteTarget.semester_number}</span>
              </div>
              <ArrowRight size={18} className="text-[#E8752D]" />
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Next Target</span>
                <span className="text-sm font-black text-[#159A78] dark:text-emerald-400">
                  {promoteTarget.semester_number === 8 ? 'Graduation 🎓' : `Semester ${promoteTarget.semester_number + 1}`}
                </span>
              </div>
            </div>

            {promoteTarget.semester_number < 8 && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Settings size={14} /> Configure Next Term Settings
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Start Date</label>
                    <CustomDatePicker
                      value={promoteForm.start_date}
                      onChange={val => setPromoteForm(p => ({ ...p, start_date: val }))}
                      placeholder="Start date..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">End Date</label>
                    <CustomDatePicker
                      value={promoteForm.end_date}
                      onChange={val => setPromoteForm(p => ({ ...p, end_date: val }))}
                      placeholder="End date..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Late Cutoff Time</label>
                    <input
                      type="text"
                      value={promoteForm.late_comer_cutoff}
                      onChange={e => setPromoteForm(p => ({ ...p, late_comer_cutoff: e.target.value }))}
                      className={inputCls}
                      placeholder="e.g. 11:00"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Max Late Limit</label>
                    <input
                      type="number"
                      value={promoteForm.late_comer_limit}
                      onChange={e => setPromoteForm(p => ({ ...p, late_comer_limit: Number(e.target.value) }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Lunch Out Start</label>
                    <input
                      type="text"
                      value={promoteForm.lunch_out_start}
                      onChange={e => setPromoteForm(p => ({ ...p, lunch_out_start: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Lunch Out End</label>
                    <input
                      type="text"
                      value={promoteForm.lunch_out_end}
                      onChange={e => setPromoteForm(p => ({ ...p, lunch_out_end: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Lunch In Start</label>
                    <input
                      type="text"
                      value={promoteForm.lunch_in_start}
                      onChange={e => setPromoteForm(p => ({ ...p, lunch_in_start: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Lunch In End</label>
                    <input
                      type="text"
                      value={promoteForm.lunch_in_end}
                      onChange={e => setPromoteForm(p => ({ ...p, lunch_in_end: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>

              </div>
            )}

            <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <span>Moving <strong>{promoteTarget.student_count} enrolled students</strong> to target batch</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <span>Resetting latecomer entry counters for new academic term</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPromoteTarget(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmPromoteBatch}
                className="flex-1 py-2.5 px-4 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all cursor-pointer"
              >
                Confirm & Promote →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
