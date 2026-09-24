import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { UserCheck, Plus, Trash2, Shield, User, Layers, BookOpen } from 'lucide-react';
import { showAlert } from '../../utils/modal';

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
}

interface UserItem {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

interface DepartmentItem {
  id: number;
  name: string;
  code: string;
}

interface SectionItem {
  id: number;
  name: string;
  department_id: number;
}

export default function MentorAssignmentsPage() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [assignments, setAssignments] = useState<MentorAssignmentItem[]>([]);
  const [mentors, setMentors] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedMentorId, setSelectedMentorId] = useState<number | ''>('');
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedSecId, setSelectedSecId] = useState<number | ''>('');
  const [studentRollQuery, setStudentRollQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users', { headers });
      const mentorList = res.data.filter((u: any) => u.role === 'mentor');
      setMentors(mentorList);
      if (mentorList.length > 0 && !selectedMentorId) {
        setSelectedMentorId(mentorList[0].id);
      }
    } catch { /* silent */ }
  };

  const fetchDepartmentsAndSections = async () => {
    try {
      const [deptRes, secRes] = await Promise.all([
        axios.get('/api/admin/departments', { headers }),
        axios.get('/api/admin/sections', { headers })
      ]);
      setDepartments(deptRes.data);
      setSections(secRes.data);
    } catch { /* silent */ }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const colParam = collegeId ? `?college_id=${collegeId}` : '';
      const res = await axios.get(`/api/admin/mentors/assignments${colParam}`, { headers });
      setAssignments(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartmentsAndSections();
    fetchAssignments();
  }, [collegeId]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorId) return;
    setCreating(true);

    try {
      let targetStudentId = null;
      if (studentRollQuery.trim()) {
        const studRes = await axios.get(`/api/admin/directory/search?q=${encodeURIComponent(studentRollQuery.trim())}`, { headers });
        targetStudentId = studRes.data.id;
      }

      await axios.post('/api/admin/mentors/assignments', {
        mentor_id: Number(selectedMentorId),
        department_id: selectedDeptId ? Number(selectedDeptId) : null,
        section_id: selectedSecId ? Number(selectedSecId) : null,
        student_id: targetStudentId
      }, { headers });

      showAlert('Success', 'Mentor assignment saved successfully!');
      setStudentRollQuery('');
      await fetchAssignments();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to create assignment');
    } finally { setCreating(false); }
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      await axios.delete(`/api/admin/mentors/assignments/${id}`, { headers });
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch {
      showAlert('Error', 'Failed to remove assignment');
    }
  };

  const filteredSections = selectedDeptId 
    ? sections.filter(s => s.department_id === Number(selectedDeptId))
    : sections;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-emerald-500" /> Mentor Student Scoping & Assignments
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Assign faculty mentors to specific sections or individual students. Mentors are restricted to monitoring only their assigned scope.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Assignment Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-500" /> New Assignment
          </h2>

          <form onSubmit={handleCreateAssignment} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Select Mentor</label>
              <select 
                value={selectedMentorId}
                onChange={e => setSelectedMentorId(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                {mentors.length === 0 ? (
                  <option value="">No Mentor Users Found</option>
                ) : (
                  mentors.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.username})</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Assign to Department (optional)</label>
              <select 
                value={selectedDeptId}
                onChange={e => { setSelectedDeptId(e.target.value ? Number(e.target.value) : ''); setSelectedSecId(''); }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="">-- All / Select Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Assign to Section (optional)</label>
              <select 
                value={selectedSecId}
                onChange={e => setSelectedSecId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="">-- Entire Department / Select Section --</option>
                {filteredSections.map(s => (
                  <option key={s.id} value={s.id}>Section {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Specific Student Roll/Admn (optional)</label>
              <input 
                type="text"
                placeholder="Target specific student..."
                value={studentRollQuery}
                onChange={e => setStudentRollQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>

            <button 
              type="submit"
              disabled={creating || !selectedMentorId}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              {creating ? 'Assigning...' : 'Assign Mentor Scope'}
            </button>
          </form>
        </div>

        {/* Existing Assignments List */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Active Mentor Assignments ({assignments.length})</h2>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">No mentor assignments created yet.</div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {assignments.map(a => (
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
                        <>Department: <span className="underline">{a.department_name}</span></>
                      ) : (
                        'Full College Scope'
                      )}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteAssignment(a.id)}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
                    title="Remove Assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
