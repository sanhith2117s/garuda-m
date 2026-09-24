import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { UserCheck, Plus, Trash2, Shield, User, Layers, Calendar, BookOpen, X, UserPlus, CheckSquare, Square } from 'lucide-react';
import { showAlert } from '../../utils/modal';
import CustomSelect from '../../components/CustomSelect';

interface HODAssignmentItem {
  id: number;
  hod_id: number;
  hod_name: string;
  hod_username: string;
  college_id: number;
  college_name: string;
  department_id: number;
  department_name: string;
  year?: number;
  created_at?: string;
}

interface MentorAssignmentItem {
  id: number;
  mentor_id: number;
  mentor_name: string;
  mentor_username: string;
  department_id?: number;
  department_name?: string;
  section_id?: number;
  section_name?: string;
  student_id?: number;
  student_name?: string;
  student_roll?: string;
  year?: number;
}

interface UserItem {
  id: number;
  username: string;
  full_name: string;
  role: string;
  college_id?: number;
}

interface DepartmentItem {
  id: number;
  college_id: number;
  name: string;
  code: string;
  is_hs?: boolean;
}

interface SectionItem {
  id: number;
  name: string;
  department_id: number;
  college_id?: number;
}

export default function FacultyAllotmentsPage() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const role = useAuthStore(s => s.role);
  const getHeaders = () => {
    const activeToken = token || localStorage.getItem('token');
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  };

  const [activeTab, setActiveTab] = useState<'hod' | 'mentor'>('hod');

  // Lists
  const [hodAssignments, setHodAssignments] = useState<HODAssignmentItem[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignmentItem[]>([]);
  const [hodUsers, setHodUsers] = useState<UserItem[]>([]);
  const [mentorUsers, setMentorUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>(collegeId ? String(collegeId) : '');

  // HOD Form state (Multi-Year Checkboxes)
  const [selectedHodId, setSelectedHodId] = useState<string>('');
  const [selectedHodDeptId, setSelectedHodDeptId] = useState<string>('');
  const [selectedHodYears, setSelectedHodYears] = useState<number[]>([]);
  const [creatingHod, setCreatingHod] = useState(false);

  // Mentor Form state
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [selectedMentorDeptId, setSelectedMentorDeptId] = useState<string>('');
  const [selectedMentorSecId, setSelectedMentorSecId] = useState<string>('');
  const [studentRollQuery, setStudentRollQuery] = useState('');
  const [creatingMentor, setCreatingMentor] = useState(false);

  // Unified Create & Map Mentor Modal state
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mFullName, setMFullName] = useState('');
  const [mUsername, setMUsername] = useState('');
  const [mPassword, setMPassword] = useState('');
  const [mCollegeId, setMCollegeId] = useState<string>(collegeId ? String(collegeId) : '1');
  const [mDeptId, setMDeptId] = useState<string>('');
  const [mSecId, setMSecId] = useState<string>('');
  const [mYear, setMYear] = useState<string>('');
  const [mCreating, setMCreating] = useState(false);

  const fetchColleges = async () => {
    try {
      const res = await axios.get('/api/admin/colleges', { headers: getHeaders() });
      setColleges(res.data);
    } catch { /* silent */ }
  };

  const fetchUsers = async () => {
    try {
      const colParam = selectedCollegeFilter ? `?college_id=${selectedCollegeFilter}` : (collegeId ? `?college_id=${collegeId}` : '');
      const res = await axios.get(`/api/admin/users${colParam}`, { headers: getHeaders() });
      setHodUsers(res.data.filter((u: any) => u.role === 'hod' || u.role === 'admin'));
      setMentorUsers(res.data.filter((u: any) => u.role === 'mentor' || u.role === 'hod'));
    } catch { /* silent */ }
  };

  const fetchDepartmentsAndSections = async () => {
    try {
      const colParam = selectedCollegeFilter ? `?college_id=${selectedCollegeFilter}` : (collegeId ? `?college_id=${collegeId}` : '');
      const [deptRes, secRes] = await Promise.all([
        axios.get(`/api/admin/departments${colParam}`, { headers: getHeaders() }),
        axios.get(`/api/admin/sections${colParam}`, { headers: getHeaders() })
      ]);
      setDepartments(deptRes.data);
      setSections(secRes.data);
    } catch (err) {
      console.error("Failed to fetch departments/sections:", err);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const colParam = selectedCollegeFilter ? `?college_id=${selectedCollegeFilter}` : (collegeId ? `?college_id=${collegeId}` : '');
      const [hodRes, mentorRes] = await Promise.all([
        axios.get(`/api/admin/hod-assignments${colParam}`, { headers: getHeaders() }),
        axios.get(`/api/admin/mentors/assignments${colParam}`, { headers: getHeaders() })
      ]);
      setHodAssignments(hodRes.data);
      setMentorAssignments(mentorRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchColleges();
  }, [token]);

  useEffect(() => {
    fetchDepartmentsAndSections();
    fetchUsers();
    fetchAssignments();
  }, [selectedCollegeFilter, collegeId, token]);

  // Toggle year selection in multi-year checkboxes
  const toggleYearCheckbox = (yr: number) => {
    setSelectedHodYears(prev => 
      prev.includes(yr) ? prev.filter(y => y !== yr) : [...prev, yr]
    );
  };

  // HOD Assignment creation with multi-year support
  const handleCreateHodAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHodId || !selectedHodDeptId) return;
    setCreatingHod(true);
    try {
      await axios.post('/api/admin/hod-assignments', {
        hod_id: Number(selectedHodId),
        department_id: Number(selectedHodDeptId),
        years: selectedHodYears.length > 0 ? selectedHodYears : [1, 2, 3, 4]
      }, { headers: getHeaders() });

      showAlert('Success', 'HOD Year Allotment(s) created successfully!');
      setSelectedHodId('');
      setSelectedHodDeptId('');
      setSelectedHodYears([]);
      await fetchAssignments();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to create HOD allotment');
    } finally { setCreatingHod(false); }
  };

  const handleDeleteHodAssignment = async (id: number) => {
    try {
      await axios.delete(`/api/admin/hod-assignments/${id}`, { headers: getHeaders() });
      setHodAssignments(prev => prev.filter(a => a.id !== id));
    } catch {
      showAlert('Error', 'Failed to remove HOD allotment');
    }
  };

  // Mentor Assignment creation
  const handleCreateMentorAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorId) return;
    setCreatingMentor(true);
    try {
      let targetStudentId = null;
      if (studentRollQuery.trim()) {
        const studRes = await axios.get(`/api/admin/directory/search?q=${encodeURIComponent(studentRollQuery.trim())}`, { headers: getHeaders() });
        targetStudentId = studRes.data.id;
      }

      await axios.post('/api/admin/mentors/assignments', {
        mentor_id: Number(selectedMentorId),
        department_id: selectedMentorDeptId ? Number(selectedMentorDeptId) : null,
        section_id: selectedMentorSecId ? Number(selectedMentorSecId) : null,
        student_id: targetStudentId
      }, { headers: getHeaders() });

      showAlert('Success', 'Mentor assignment saved successfully!');
      setStudentRollQuery('');
      await fetchAssignments();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to create mentor assignment');
    } finally { setCreatingMentor(false); }
  };

  // Unified Create Account & Map Mentor submit handler
  const handleCreateAndMapMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mFullName || !mUsername || !mPassword) return;
    setMCreating(true);
    try {
      const userRes = await axios.post('/api/admin/users', {
        full_name: mFullName,
        username: mUsername,
        password: mPassword,
        role: 'mentor',
        college_id: mCollegeId ? Number(mCollegeId) : Number(collegeId || 1)
      }, { headers: getHeaders() });

      const newMentorId = userRes.data.id;

      if (mDeptId || mSecId || mYear) {
        await axios.post('/api/admin/mentors/assignments', {
          mentor_id: newMentorId,
          department_id: mDeptId ? Number(mDeptId) : null,
          section_id: mSecId ? Number(mSecId) : null,
          year: mYear ? Number(mYear) : null
        }, { headers: getHeaders() });
      }

      showAlert('Success', `Mentor account '${mFullName}' created & mapped successfully!`);
      setShowMentorModal(false);
      setMFullName('');
      setMUsername('');
      setMPassword('');
      setMDeptId('');
      setMSecId('');
      setMYear('');
      await fetchUsers();
      await fetchAssignments();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to create and map mentor account');
    } finally { setMCreating(false); }
  };

  const handleDeleteMentorAssignment = async (id: number) => {
    try {
      await axios.delete(`/api/admin/mentors/assignments/${id}`, { headers: getHeaders() });
      setMentorAssignments(prev => prev.filter(a => a.id !== id));
    } catch {
      showAlert('Error', 'Failed to remove mentor assignment');
    }
  };

  // Selected HOD User object
  const selectedHodUser = hodUsers.find(u => String(u.id) === String(selectedHodId));

  // Determine effective college filtering for HOD allotment
  const hodCollegeId = selectedHodUser?.college_id ? String(selectedHodUser.college_id) : selectedCollegeFilter;

  // Filtered departments with fallback to all departments if filter is empty
  const matchDepts = hodCollegeId ? departments.filter(d => String(d.college_id) === String(hodCollegeId)) : departments;
  const filteredDepartments = matchDepts.length > 0 ? matchDepts : departments;

  const filteredMentorSections = selectedMentorDeptId 
    ? sections.filter(s => s.department_id === Number(selectedMentorDeptId))
    : sections;

  const modalFilteredDepartments = (mCollegeId && role === 'super_admin')
    ? departments.filter(d => String(d.college_id) === String(mCollegeId))
    : departments;

  const modalFilteredSections = mDeptId 
    ? sections.filter(s => s.department_id === Number(mDeptId))
    : sections;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-500" /> Faculty Allotments & Roles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign HOD users to specific Department Academic Years (1-4) and map Faculty Mentors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === 'super_admin' && (
            <div className="w-48">
              <CustomSelect
                value={selectedCollegeFilter}
                onChange={val => { setSelectedCollegeFilter(val); setSelectedHodDeptId(''); setSelectedMentorDeptId(''); }}
                options={[
                  { value: '', label: 'All Colleges (KMEC & NGIT)' },
                  ...colleges.map(c => ({ value: String(c.id), label: `${c.name} (${c.code})` }))
                ]}
                placeholder="All Colleges"
              />
            </div>
          )}

          <button
            onClick={() => setShowMentorModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <UserPlus size={16} className="text-white !text-white" style={{ color: '#ffffff', stroke: '#ffffff' }} />
            <span>Create & Map Mentor</span>
          </button>

          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setActiveTab('hod')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'hod' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              HOD Multi-Year Allotments
            </button>
            <button 
              onClick={() => setActiveTab('mentor')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'mentor' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Mentor Scope Allotments
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'hod' ? (
        /* HOD Multi-Year Allotments Tab */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* HOD Allotment Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" /> Assign HOD to Department
            </h2>

            <form onSubmit={handleCreateHodAssignment} className="space-y-4 relative z-30 overflow-visible">
              <div className="relative z-30">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Select HOD Account *</label>
                <CustomSelect
                  value={selectedHodId}
                  onChange={setSelectedHodId}
                  options={[
                    { value: '', label: '-- Select HOD Account --' },
                    ...hodUsers.map(h => ({ value: String(h.id), label: `${h.full_name} (${h.username})` }))
                  ]}
                  placeholder="-- Select HOD Account --"
                />
              </div>

              <div className="relative z-20">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Department *</label>
                <CustomSelect
                  value={selectedHodDeptId}
                  onChange={setSelectedHodDeptId}
                  options={[
                    { value: '', label: '-- Select Department --' },
                    ...filteredDepartments.map(d => ({ 
                      value: String(d.id), 
                      label: `${d.name} (${d.code}) • ${colleges.find(c => c.id === d.college_id)?.code || (d.college_id === 1 ? 'KMEC' : 'NGIT')}` 
                    }))
                  ]}
                  placeholder="-- Select Department --"
                />
              </div>

              {/* Multi-Year Selection Checkboxes */}
              <div className="relative z-10">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Academic Year Allotments (Select Checkboxes)</label>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div 
                    onClick={() => toggleYearCheckbox(1)}
                    className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none hover:text-emerald-600"
                  >
                    {selectedHodYears.includes(1) ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} className="text-slate-400" />}
                    <span>1st Year (Always H&S Dept)</span>
                  </div>
                  <div 
                    onClick={() => toggleYearCheckbox(2)}
                    className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none hover:text-emerald-600"
                  >
                    {selectedHodYears.includes(2) ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} className="text-slate-400" />}
                    <span>2nd Year</span>
                  </div>
                  <div 
                    onClick={() => toggleYearCheckbox(3)}
                    className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none hover:text-emerald-600"
                  >
                    {selectedHodYears.includes(3) ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} className="text-slate-400" />}
                    <span>3rd Year</span>
                  </div>
                  <div 
                    onClick={() => toggleYearCheckbox(4)}
                    className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none hover:text-emerald-600"
                  >
                    {selectedHodYears.includes(4) ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} className="text-slate-400" />}
                    <span>4th Year</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">Leave unchecked to allot all years (1-4).</p>
              </div>

              <button 
                type="submit"
                disabled={creatingHod || !selectedHodId || !selectedHodDeptId}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer uppercase tracking-wider"
              >
                {creatingHod ? 'Saving...' : 'Save HOD Multi-Year Allotment'}
              </button>
            </form>
          </div>

          {/* Active HOD Allotments List */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Active HOD Year Mappings ({hodAssignments.length})</h2>
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading HOD assignments...</div>
            ) : hodAssignments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No HOD year allotments created yet.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {hodAssignments.map(a => {
                  const colCode = a.college_name || (a.college_id === 1 ? 'KMEC' : 'NGIT');
                  return (
                    <div key={a.id} className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between shadow-xs hover:border-emerald-300 transition-all">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">{a.hod_name}</span>
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">({a.hod_username})</span>
                          <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-black uppercase tracking-wider ${
                            colCode.includes('NGIT')
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                          }`}>
                            {colCode}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <span>Dept: <strong className="text-slate-900 dark:text-white font-extrabold">{a.department_name}</strong></span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[11px] font-black">
                            {a.year ? `Year ${a.year}` : 'All Years (1-4)'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteHodAssignment(a.id)}
                        className="p-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-xs"
                        title="Remove Allotment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mentor Section Allotments Tab */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" /> New Mentor Allotment
            </h2>

            <form onSubmit={handleCreateMentorAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Select Mentor User *</label>
                <CustomSelect
                  value={selectedMentorId}
                  onChange={setSelectedMentorId}
                  options={[
                    { value: '', label: '-- Select Mentor User --' },
                    ...mentorUsers.map(m => ({ value: String(m.id), label: `${m.full_name} (${m.username})` }))
                  ]}
                  placeholder="-- Select Mentor User --"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Department (optional)</label>
                <CustomSelect
                  value={selectedMentorDeptId}
                  onChange={val => { setSelectedMentorDeptId(val); setSelectedMentorSecId(''); }}
                  options={[
                    { value: '', label: '-- All Departments --' },
                    ...filteredDepartments.map(d => ({ 
                      value: String(d.id), 
                      label: `${d.name} (${d.code}) • ${colleges.find(c => c.id === d.college_id)?.code || (d.college_id === 1 ? 'KMEC' : 'NGIT')}` 
                    }))
                  ]}
                  placeholder="-- All Departments --"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Section (optional)</label>
                <CustomSelect
                  value={selectedMentorSecId}
                  onChange={setSelectedMentorSecId}
                  options={[
                    { value: '', label: '-- Entire Department (No Section) --' },
                    ...filteredMentorSections.map(s => ({ value: String(s.id), label: `Section ${s.name}` }))
                  ]}
                  placeholder="-- Entire Department (No Section) --"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Specific Student Roll/Admn (optional)</label>
                <input 
                  type="text"
                  placeholder="Target specific student roll..."
                  value={studentRollQuery}
                  onChange={e => setStudentRollQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <button 
                type="submit"
                disabled={creatingMentor || !selectedMentorId}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer uppercase tracking-wider"
              >
                {creatingMentor ? 'Saving...' : 'Save Mentor Allotment'}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Active Mentor Mappings ({mentorAssignments.length})</h2>
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading mentor assignments...</div>
            ) : mentorAssignments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No mentor allotments created yet.</div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {mentorAssignments.map(a => (
                  <div key={a.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{a.mentor_name}</span>
                        <span className="text-[10px] font-mono font-semibold text-slate-400">({a.mentor_username})</span>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        {a.student_name ? (
                          <>Student: <span className="underline">{a.student_name} ({a.student_roll})</span></>
                        ) : a.section_name ? (
                          <>Section: <span className="underline">{a.department_name} - Section {a.section_name}</span></>
                        ) : a.department_name ? (
                          <>Department: <span className="underline">{a.department_name} (Entire Dept)</span></>
                        ) : (
                          'Full College Scope'
                        )}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteMentorAssignment(a.id)}
                      className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Remove Allotment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Create & Map Mentor Modal */}
      {showMentorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-500" /> Create & Map Mentor Account
              </h3>
              <button onClick={() => setShowMentorModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateAndMapMentor} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Full Name *</label>
                  <input 
                    type="text" required
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={mFullName}
                    onChange={e => setMFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Username *</label>
                  <input 
                    type="text" required
                    placeholder="e.g. mentor_ramesh"
                    value={mUsername}
                    onChange={e => setMUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Password *</label>
                  <input 
                    type="password" required
                    placeholder="Set password..."
                    value={mPassword}
                    onChange={e => setMPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">College *</label>
                  <CustomSelect
                    value={mCollegeId}
                    onChange={val => { setMCollegeId(val); setMDeptId(''); }}
                    options={[
                      { value: '1', label: 'KMEC' },
                      { value: '2', label: 'NGIT' }
                    ]}
                    placeholder="Select College"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Mentor Scope (Optional Section)</p>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Department</label>
                  <CustomSelect
                    value={mDeptId}
                    onChange={val => { setMDeptId(val); setMSecId(''); }}
                    options={[
                      { value: '', label: '-- All Departments --' },
                      ...modalFilteredDepartments.map(d => ({ value: String(d.id), label: `${d.name} (${d.code})` }))
                    ]}
                    placeholder="-- All Departments --"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Academic Year (optional)</label>
                    <CustomSelect
                      value={mYear}
                      onChange={setMYear}
                      options={[
                        { value: '', label: 'All Years' },
                        { value: '1', label: '1st Year' },
                        { value: '2', label: '2nd Year' },
                        { value: '3', label: '3rd Year' },
                        { value: '4', label: '4th Year' }
                      ]}
                      placeholder="All Years"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Section (optional)</label>
                    <CustomSelect
                      value={mSecId}
                      onChange={setMSecId}
                      options={[
                        { value: '', label: 'No Section (Entire Dept)' },
                        ...modalFilteredSections.map(s => ({ value: String(s.id), label: `Section ${s.name}` }))
                      ]}
                      placeholder="No Section (Entire Dept)"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={mCreating || !mFullName || !mUsername || !mPassword}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 uppercase tracking-wider cursor-pointer mt-2"
              >
                {mCreating ? 'Creating & Mapping...' : 'Create & Map Mentor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
