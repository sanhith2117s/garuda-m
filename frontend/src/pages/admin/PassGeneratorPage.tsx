import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import { Key, Search, Plus, CheckCircle, XCircle, UserCheck, ShieldCheck, User, ArrowRight, Stethoscope, Car, Award, Users } from 'lucide-react';
import { getCollegeAssets } from '../../utils/collegeAssets';

interface StudentItem {
  id: number;
  full_name: string;
  roll_number: string;
  admn_no: string;
  branch?: string;
  section?: string;
  semester?: number;
  photo_url?: string;
}

const REASON_OPTIONS = [
  { value: 'Half Day', label: 'Half Day' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Outstation', label: 'Outstation' },
  { value: 'Other', label: 'Other' },
];

const QUICK_REASONS = [
  {
    label: 'Half Day',
    val: 'Half Day',
    icon: UserCheck,
    activeStyle: 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]',
    idleStyle: 'bg-emerald-50/60 hover:bg-emerald-100/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  {
    label: 'Medical',
    val: 'Medical',
    icon: Stethoscope,
    activeStyle: 'border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-[1.02]',
    idleStyle: 'bg-rose-50/60 hover:bg-rose-100/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border-rose-200/80 dark:border-rose-800/60',
    iconColor: 'text-rose-600 dark:text-rose-400'
  },
  {
    label: 'Outstation',
    val: 'Outstation',
    icon: Car,
    activeStyle: 'border-amber-600 bg-amber-600 text-white shadow-lg shadow-amber-600/30 scale-[1.02]',
    idleStyle: 'bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200/80 dark:border-amber-800/60',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  {
    label: 'Other',
    val: 'Other',
    icon: Award,
    activeStyle: 'border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-[1.02]',
    idleStyle: 'bg-purple-50/60 hover:bg-purple-100/70 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 border-purple-200/80 dark:border-purple-800/60',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
];

export default function PassGeneratorPage() {
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const collegeId = useAuthStore(s => s.collegeId);
  const collegeCode = useAuthStore(s => s.collegeCode);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const assets = getCollegeAssets(collegeCode, role);

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [reason, setReason] = useState('Half Day');
  const [notes, setNotes] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; passDetails?: any } | null>(null);

  // Bulk Generator State
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [bulkBranch, setBulkBranch] = useState('');
  const [bulkSemester, setBulkSemester] = useState('');
  const [bulkSection, setBulkSection] = useState('');
  const [bulkReason, setBulkReason] = useState('Half Day');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkFilters, setBulkFilters] = useState<{ departments?: any[]; branches: string[]; semesters: number[]; sections: string[] }>({ departments: [], branches: [], semesters: [], sections: [] });

  const studentCollegeCode = selectedStudent ? (selectedStudent.roll_number?.includes('53') || selectedStudent.roll_number?.includes('NG') ? 'NGIT' : selectedStudent.roll_number?.includes('55') || selectedStudent.roll_number?.includes('KM') ? 'KMEC' : collegeCode) : collegeCode;
  const studentAssets = getCollegeAssets(studentCollegeCode, role);

  const [customPassTypes, setCustomPassTypes] = useState<any[]>([]);
  const [studentHistory, setStudentHistory] = useState<any>(null);

  useEffect(() => {
    if (!selectedStudent || !token) {
      setStudentHistory(null);
      setIsEmergency(false);
      setEmergencyReason('');
      return;
    }
    axios.get(`/api/admin/directory/student-history/${encodeURIComponent(selectedStudent.roll_number || selectedStudent.admn_no)}`, { headers })
      .then(r => setStudentHistory(r.data))
      .catch(() => setStudentHistory(null));
  }, [selectedStudent, token]);

  useEffect(() => {
    if (!token) return;
    const colParam = collegeId ? `?college_id=${collegeId}` : '';
    axios.get(`/api/bulk/filters${colParam}`, { headers })
      .then(r => setBulkFilters(r.data))
      .catch(() => {
        axios.get(`/api/admin/bulk/filters${colParam}`, { headers })
          .then(r => setBulkFilters(r.data))
          .catch(() => { });
      });

    axios.get(`/api/admin/custom-passes/types${colParam}`, { headers })
      .then(r => setCustomPassTypes(r.data || []))
      .catch(() => setCustomPassTypes([]));
  }, [mode, collegeId, token]);

  const fetchStudents = (query: string) => {
    if (!query.trim()) {
      setStudents([]);
      return;
    }
    const colParam = collegeId ? `&college_id=${collegeId}` : '';
    axios.get(`/api/admin/directory?search=${encodeURIComponent(query)}${colParam}`, { headers })
      .then(r => setStudents(r.data.items || r.data || []))
      .catch(() => setStudents([]));
  };

  useEffect(() => {
    if (mode === 'single') {
      const timer = setTimeout(() => {
        fetchStudents(searchQuery);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, collegeId, mode]);

  const handleGeneratePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setFeedback({ type: 'error', message: 'Please search and select a student first.' });
      return;
    }

    if (isEmergency && !emergencyReason.trim()) {
      setFeedback({ type: 'error', message: 'Please provide an Emergency Reason/Remark for the limit override.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await axios.post('/api/gate/generate-pass', {
        student_id: selectedStudent.id,
        reason,
        notes,
        is_emergency: isEmergency,
        emergency_reason: emergencyReason
      }, { headers });

      setFeedback({
        type: 'success',
        message: res.data.message || `Gate pass activated for ${selectedStudent.full_name} (${selectedStudent.roll_number})!`,
        passDetails: {
          student_name: selectedStudent.full_name,
          roll_number: selectedStudent.roll_number,
          reason,
        }
      });

      setSelectedStudent(null);
      setSearchQuery('');
      setNotes('');
      setIsEmergency(false);
      setEmergencyReason('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to generate gate pass.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGeneratePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const isNum = !isNaN(Number(bulkDepartment)) && Number(bulkDepartment) > 0;
      const res = await axios.post('/api/bulk/generate-passes', {
        department_id: isNum && Number(bulkDepartment) < 1000 ? Number(bulkDepartment) : null,
        department_code: !isNum ? bulkDepartment : (bulkFilters.departments?.find(d => String(d.id) === String(bulkDepartment))?.code || null),
        semester: bulkSemester ? Number(bulkSemester) : null,
        section: bulkSection || null,
        reason: bulkReason,
        notes: bulkNotes
      }, { headers });

      setFeedback({
        type: 'success',
        message: res.data.message || 'Bulk section outpasses generated and activated successfully!'
      });

      setBulkNotes('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to generate bulk passes.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pass-generator-page space-y-8 pb-10 relative">
      {/* Top Page Header Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Key size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gate Pass Generator</h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {assets.code}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Issue & activate instant individual or bulk section outpasses</p>
          </div>
        </div>

        {/* Mode Toggle (Single vs Bulk) */}
        {(role === 'admin' || role === 'super_admin' || role === 'hod') && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-max">
            <button
              onClick={() => { setMode('single'); setFeedback(null); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${mode === 'single'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <User size={15} /> Single Pass
            </button>
            <button
              onClick={() => { setMode('bulk'); setFeedback(null); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${mode === 'bulk'
                  ? 'bg-[#E8752D] text-white shadow-md shadow-orange-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Users size={15} /> Bulk Section Outpass (Admin)
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in duration-200 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
          {feedback.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <div>
            <p className="text-sm font-black">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Mode 1: Single Pass Generator */}
      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Student Search & ID Card Display (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col h-full justify-between space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl relative">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <Search size={15} className="text-[#E8752D] dark:text-[#FB923C]" />
                1. Student Directory Lookup
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Roll No or Name (e.g. 25BD1A0501)..."
                  value={selectedStudent ? `${selectedStudent.full_name} (${selectedStudent.roll_number})` : searchQuery}
                  onChange={e => {
                    setSelectedStudent(null);
                    setSearchQuery(e.target.value);
                  }}
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                />
                {selectedStudent ? (
                  <button
                    type="button"
                    onClick={() => { setSelectedStudent(null); setSearchQuery(''); }}
                    className="absolute right-3 top-3.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-lg px-2 py-0.5 cursor-pointer"
                  >
                    Clear
                  </button>
                ) : (
                  <Search size={18} className="absolute right-3.5 top-4 text-slate-400" />
                )}
              </div>

              {!selectedStudent && students.length > 0 && (
                <div className="absolute z-40 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-72 overflow-y-auto p-1.5 space-y-1">
                  {students.map(stud => (
                    <button
                      key={stud.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(stud);
                        setStudents([]);
                      }}
                      className="w-full p-3 text-left hover:bg-emerald-50 dark:hover:bg-slate-700/60 rounded-xl flex items-center justify-between transition-all group border border-transparent hover:border-emerald-100 dark:hover:border-slate-600 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0">
                          <img
                            src={`/api/static/photos/${stud.roll_number}.jpg`}
                            alt={stud.full_name}
                            className="w-full h-full object-cover"
                            onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(stud.full_name)}&background=059669&color=fff`; }}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{stud.full_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{stud.roll_number} • College: {stud.roll_number && (stud.roll_number.includes('NG') || stud.roll_number.includes('53')) ? 'NGIT' : 'KMEC'} • Admn: {stud.admn_no}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent ? (
              <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 relative overflow-hidden flex-1 flex flex-col justify-between transform transition-all duration-300 animate-in fade-in zoom-in-95">
                <img src={studentAssets.bgLogo} alt="" className="absolute -right-8 -bottom-8 w-56 h-56 object-contain opacity-[0.08] dark:opacity-[0.12] pointer-events-none select-none" />
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6 relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" /> Student Profile
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-bold">
                    Active
                  </span>
                </div>

                <div className="flex flex-col items-center text-center gap-4 my-auto">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800 mx-auto">
                    <img
                      src={`/api/static/photos/${selectedStudent.roll_number}.jpg`}
                      alt={selectedStudent.full_name}
                      className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.full_name)}&background=059669&color=fff&bold=true`; }}
                    />
                  </div>

                  <div className="space-y-2 w-full">
                    <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{selectedStudent.full_name}</h3>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        {selectedStudent.roll_number}
                      </span>
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-800 rounded-lg text-xs font-black uppercase text-indigo-700 dark:text-indigo-300">
                        College: {(selectedStudent.roll_number && (selectedStudent.roll_number.includes('NG') || selectedStudent.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                      </span>
                    </div>

                    {/* Prominent Semester & Daily Pass Usage Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${studentHistory?.pass_summary?.limit_reached ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'}`}>
                        Pass Usage: {studentHistory?.pass_summary?.used_normal_passes ?? 0} / {studentHistory?.pass_summary?.max_normal_passes ?? 5} Used
                      </span>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${studentHistory?.pass_summary?.has_pass_today ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                        Today: {studentHistory?.pass_summary?.has_pass_today ? '1 / 1 Issued' : '0 / 1 Issued'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-3 text-slate-600 dark:text-slate-300 font-semibold border-t border-slate-100 dark:border-slate-800 mt-3 w-full">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 font-extrabold uppercase block">Admission No</span>
                        <span className="font-mono text-slate-900 dark:text-white font-bold">{selectedStudent.admn_no || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 font-extrabold uppercase block">Class / Sec</span>
                        <span className="text-slate-900 dark:text-white font-bold">{studentHistory?.student?.section_display || `${selectedStudent.branch || ''} ${selectedStudent.section || ''}`}</span>
                      </div>
                    </div>

                    {/* Instant Student History & Limit Summary */}
                    {studentHistory && (
                      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2.5 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Semester Quota Summary</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${studentHistory.pass_summary?.limit_reached ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                            {studentHistory.pass_summary?.used_normal_passes} / {studentHistory.pass_summary?.max_normal_passes} Used
                          </span>
                        </div>

                        {/* Recent Outpass Logs */}
                        {studentHistory.leave_requests && studentHistory.leave_requests.length > 0 ? (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 block">Recent Outpasses ({studentHistory.leave_requests.length})</span>
                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                              {studentHistory.leave_requests.slice(0, 3).map((lr: any) => (
                                <div key={lr.id} className="text-[11px] p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                                  <div className="truncate">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{lr.reason}</span>
                                    <span className="text-[10px] text-slate-400">{lr.created_at ? lr.created_at.slice(0, 10) : ''} ({lr.out_time} → {lr.in_time})</span>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${lr.status === 'returned' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : lr.status === 'exited' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {lr.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-slate-400 pt-1">No previous outpasses this semester.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 relative overflow-hidden flex-1 flex flex-col justify-between animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-slate-400" /> Student Profile
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-bold">
                    Awaiting Selection
                  </span>
                </div>

                <div className="flex flex-col items-center text-center gap-4 my-auto">
                  <div className="w-32 h-32 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/50 shrink-0 bg-emerald-50/50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner mx-auto">
                    <User size={48} strokeWidth={1.5} />
                  </div>

                  <div className="space-y-2 w-full">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Select a Student</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                      Search by Roll Number or Name in the directory lookup above to populate identity verification details.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pass Activation Details Form (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col h-full justify-between">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
              {/* Prominent Live Student Pass Count & Semester Limit Banner */}
              {selectedStudent && studentHistory && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#E8752D] text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-600/30 shrink-0">
                      {studentHistory.pass_summary?.used_normal_passes || 0}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider">Outpasses Used This Semester</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {studentHistory.pass_summary?.used_normal_passes || 0} / {studentHistory.pass_summary?.max_normal_passes || 5} Passes Used
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] text-[#E8752D] dark:text-[#FB923C] font-black uppercase tracking-wider">Semester Limit Rules</p>
                    <p className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200">
                      Max: {studentHistory.pass_summary?.max_normal_passes || 5} Outpasses • Late Limit: {studentHistory.late_summary?.max_late_entries || 3}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleGeneratePass} className="space-y-6">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                    Quick Reason Selector
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {QUICK_REASONS.map(item => {
                      const IconComponent = item.icon;
                      const isSelected = reason === item.val;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setReason(item.val)}
                          className={`p-3.5 rounded-2xl border text-xs font-extrabold flex flex-col items-center gap-2 transition-all cursor-pointer ${isSelected ? item.activeStyle : item.idleStyle}`}
                        >
                          <IconComponent size={20} className={isSelected ? 'text-white' : item.iconColor} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Pass Reason / Category
                  </label>
                  <CustomSelect
                    value={reason}
                    onChange={val => setReason(val)}
                    options={[
                      ...REASON_OPTIONS,
                      ...customPassTypes.map((pt: any) => ({
                        value: pt.name,
                        label: `🏷️ ${pt.name} (${pt.out_time} → ${pt.in_time})`
                      }))
                    ]}
                    placeholder="Select Pass Reason"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Administrative Notes / Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter specific instructions or approval notes..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Emergency Pass Override Box */}
                {selectedStudent && (
                  <div className={`p-4 rounded-2xl border transition-all ${studentHistory?.pass_summary?.limit_reached || isEmergency ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'}`}>
                    {(role === 'admin' || role === 'super_admin') ? (
                      <div className="mb-2 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <CheckCircle size={15} className="text-amber-500 shrink-0" />
                        <span>Admin Scope: Regular gate passes are issued by Department HODs. Admins check 'Issue Emergency Pass' to grant an Emergency Override.</span>
                      </div>
                    ) : studentHistory?.pass_summary?.limit_reached ? (
                      <div className="mb-3 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                        <XCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold">Pass Limit Reached ({studentHistory.pass_summary?.used_normal_passes}/{studentHistory.pass_summary?.max_normal_passes} used, {studentHistory.pass_summary?.has_pass_today ? '1/1 today' : '0/1 today'})</p>
                          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Standard pass generation is blocked. Emergency Pass Override unlocked below.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                        <span>Standard Pass Mode ({studentHistory?.pass_summary?.used_normal_passes || 0}/{studentHistory?.pass_summary?.max_normal_passes || 5} Used). Emergency pass override unlocks once limit is exceeded.</span>
                      </div>
                    )}

                    <label className={`flex items-center gap-3 ${studentHistory?.pass_summary?.limit_reached || role === 'admin' || role === 'super_admin' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input
                        type="checkbox"
                        disabled={!studentHistory?.pass_summary?.limit_reached && role !== 'admin' && role !== 'super_admin'}
                        checked={isEmergency}
                        onChange={e => setIsEmergency(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Issue Emergency Pass (Override Limit)
                      </span>
                    </label>

                    {isEmergency && (
                      <div className="mt-3 space-y-1.5 animate-in fade-in duration-200">
                        <label className="block text-[11px] font-extrabold uppercase text-rose-700 dark:text-rose-300">
                          Emergency Reason / Remark <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Medical emergency / Parent confirmed directly"
                          value={emergencyReason}
                          onChange={e => setEmergencyReason(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !selectedStudent}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${selectedStudent && !loading
                        ? 'bg-[#E8752D] hover:bg-[#D96622] text-white shadow-lg shadow-orange-600/25 cursor-pointer active:scale-98'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300/60 dark:border-slate-700/60 cursor-not-allowed'
                      }`}
                  >
                    <Key size={18} />
                    {loading
                      ? (role === 'mentor' ? 'Submitting Request...' : 'Generating Pass...')
                      : (role === 'mentor'
                          ? 'Submit Request for Admin Approval'
                          : (role === 'hod'
                              ? 'Generate & Activate Gate Pass'
                              : (isEmergency ? 'Issue Emergency Gate Pass (Override)' : 'Generate Gate Pass')
                            )
                        )
                    }
                    {selectedStudent && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Bulk Section Pass Generator (Admin Only) */}
      {mode === 'bulk' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 max-w-3xl mx-auto overflow-visible relative z-30">
          <div>
            <h3 className="text-slate-900 dark:text-white font-black text-xl tracking-tight flex items-center gap-2">
              <Users size={24} className="text-[#E8752D]" /> Bulk Section Outpass Provision (Admin)
            </h3>
            <p className="text-slate-400 text-xs font-semibold mt-1">Activate simultaneous outpasses for all active students in a specific department, semester & section</p>
          </div>

          <form onSubmit={handleBulkGeneratePass} className="space-y-6 overflow-visible relative">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-visible relative z-40">
              <div className="relative z-30">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Department
                </label>
                <CustomSelect
                  value={bulkDepartment}
                  onChange={setBulkDepartment}
                  options={[
                    { value: '', label: 'All Departments' },
                    ...(bulkFilters.departments || []).map((d: any) => ({ value: String(d.id), label: `${d.name} (${d.code})` }))
                  ]}
                  placeholder="Select Department"
                />
              </div>

              <div className="relative z-20">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Semester
                </label>
                <CustomSelect
                  value={bulkSemester}
                  onChange={setBulkSemester}
                  options={[
                    { value: '', label: 'All Semesters' },
                    ...bulkFilters.semesters.map(s => ({ value: String(s), label: `Semester ${s}` }))
                  ]}
                  placeholder="Select Semester"
                />
              </div>

              <div className="relative z-10">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Section
                </label>
                <CustomSelect
                  value={bulkSection}
                  onChange={setBulkSection}
                  options={[
                    { value: '', label: 'All Sections' },
                    ...bulkFilters.sections.map(s => ({ value: s, label: `Section ${s}` }))
                  ]}
                  placeholder="Select Section"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Pass Reason / Event Note
              </label>
              <input
                required
                type="text"
                value={bulkReason}
                onChange={e => setBulkReason(e.target.value)}
                placeholder="e.g. Section Industrial Visit / Outing"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Administrative Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                placeholder="Enter bulk outpass notes..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-[#E8752D] hover:bg-[#D96622] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Users size={18} />
              {loading ? 'Issuing Bulk Passes...' : 'Generate Bulk Section Gate Passes'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
