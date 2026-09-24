import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { Layers, Plus, FileText, Upload, CheckCircle2, AlertTriangle, ArrowRight, Check, X, ShieldAlert, Sparkles, UserCheck, Users, Edit3, Trash2 } from 'lucide-react';
import { showAlert, showConfirm } from '../../utils/modal';
import FileDropZone from '../../components/FileDropZone';
import CustomSelect from '../../components/CustomSelect';

interface SectionItem {
  id: number;
  college_id: number;
  department_id: number;
  year?: number;
  name: string;
  is_active: boolean;
  mentor_id?: number;
  mentor_name?: string;
  student_count?: number;
}

interface DepartmentItem {
  id: number;
  college_id: number;
  name: string;
  code: string;
  hod1_name?: string;
}

interface ValidRow {
  student_id: number;
  full_name: string;
  roll_number: string;
  admn_no: string;
  old_section: string;
  new_section: string;
  new_section_id: number;
}

interface ErrorRow {
  row: number;
  admn: string;
  reason: string;
}

export default function SectionsPage() {
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [activeTab, setActiveTab] = useState<'list' | 'shuffle'>('list');
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [mentorUsers, setMentorUsers] = useState<any[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(collegeId ? String(collegeId) : '');
  const [loading, setLoading] = useState(true);

  // New section form
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [newSecName, setNewSecName] = useState('');
  const [creating, setCreating] = useState(false);

  // Mentor Allotment Modal
  const [assigningSection, setAssigningSection] = useState<SectionItem | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [savingMentor, setSavingMentor] = useState(false);

  // Bulk shuffle state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [previewData, setPreviewData] = useState<{
    total_records: number;
    valid_count: number;
    error_count: number;
    valid_rows: ValidRow[];
    error_rows: ErrorRow[];
  } | null>(null);
  const [committing, setCommitting] = useState(false);

  const fetchColleges = async () => {
    try {
      const res = await axios.get('/api/admin/colleges', { headers });
      setColleges(res.data);
    } catch { /* silent */ }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/api/admin/departments', { headers });
      setDepartments(res.data);
    } catch { /* silent */ }
  };

  const fetchMentors = async () => {
    try {
      const res = await axios.get('/api/admin/users', { headers });
      const users = Array.isArray(res.data) ? res.data : (res.data.items || []);
      setMentorUsers(users.filter((u: any) => u.role === 'mentor' || u.role === 'hod' || u.role === 'admin'));
    } catch { /* silent */ }
  };

  const fetchSections = async () => {
    setLoading(true);
    try {
      const colParam = selectedCollegeId ? `?college_id=${selectedCollegeId}` : (collegeId ? `?college_id=${collegeId}` : '');
      const res = await axios.get(`/api/admin/sections${colParam}`, { headers });
      setSections(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchColleges();
    fetchDepartments();
    fetchMentors();
  }, []);

  useEffect(() => {
    fetchSections();
  }, [selectedCollegeId]);

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !newSecName.trim()) return;
    setCreating(true);

    const dept = departments.find(d => String(d.id) === String(selectedDeptId));
    const targetColId = dept ? dept.college_id : Number(selectedCollegeId || collegeId || 1);

    try {
      await axios.post('/api/admin/sections', {
        college_id: targetColId,
        department_id: Number(selectedDeptId),
        year: selectedYear,
        name: newSecName.trim().toUpperCase()
      }, { headers });

      showAlert('Success', `Section '${newSecName.trim().toUpperCase()}' created successfully!`);
      setNewSecName('');
      fetchSections();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to create section.');
    } finally { setCreating(false); }
  };

  const handleAssignMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSection || !selectedMentorId) return;

    const mentorUser = mentorUsers.find(u => String(u.id) === String(selectedMentorId));
    const mentorName = mentorUser ? mentorUser.full_name || mentorUser.username : 'Selected Mentor';

    const confirmed = await showConfirm(
      'Confirm Faculty Mentor Allotment',
      `Assign ${mentorName} as Section Mentor for Section ${assigningSection.name}? When HOD is marked unavailable, fallback requests for this section will route to this mentor.`
    );
    if (!confirmed) return;

    setSavingMentor(true);
    try {
      await axios.post('/api/admin/faculty-allotments', {
        section_id: assigningSection.id,
        mentor_id: Number(selectedMentorId)
      }, { headers });

      showAlert('Success', `Faculty Mentor assigned to Section ${assigningSection.name}!`);
      setAssigningSection(null);
      fetchSections();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to assign mentor.');
    } finally { setSavingMentor(false); }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "admn_no,new_section\n24531A0501,B\n24531A0502,C\n24531A0503,A";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "section_shuffle_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleValidateCSV = async () => {
    if (!csvFile) return;
    setValidating(true);
    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await axios.post('/api/admin/sections/validate-shuffle', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(res.data);
    } catch (err: any) {
      showAlert('CSV Error', err.response?.data?.detail || 'Failed to parse CSV file.');
    } finally { setValidating(false); }
  };

  const handleCommitShuffle = async () => {
    if (!previewData || previewData.valid_count === 0) return;
    setCommitting(true);

    try {
      const payload = {
        updates: previewData.valid_rows.map(r => ({
          student_id: r.student_id,
          new_section_id: r.new_section_id
        }))
      };

      const res = await axios.post('/api/admin/sections/commit-shuffle', payload, { headers });
      showAlert('Success', `Successfully updated sections for ${res.data.updated_count || previewData.valid_count} students!`);
      setPreviewData(null);
      setCsvFile(null);
      fetchSections();
    } catch (err: any) {
      showAlert('Commit Failed', err.response?.data?.detail || 'Failed to apply section changes.');
    } finally { setCommitting(false); }
  };

  const filteredDepartments = selectedCollegeId
    ? departments.filter(d => String(d.college_id) === String(selectedCollegeId))
    : departments;

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="text-emerald-500" /> Section & Faculty Mentor Allotments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Configure section allotments (Year | Dept | Sec | Mentor | Strength) and execute bulk section shuffles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Allotment Matrix
            </button>
            <button
              onClick={() => setActiveTab('shuffle')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'shuffle' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Bulk Section Shuffle
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create Section Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Plus className="w-4 h-4 text-emerald-500" /> Create New Section
            </h2>
            <form onSubmit={handleCreateSection} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">College</label>
                <CustomSelect
                  value={selectedCollegeId}
                  onChange={val => { setSelectedCollegeId(val); setSelectedDeptId(''); }}
                  options={[
                    { value: '', label: 'All Colleges' },
                    ...colleges.map(c => ({ value: String(c.id), label: `${c.name} (${c.code})` }))
                  ]}
                  placeholder="Select College"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Academic Year *</label>
                <CustomSelect
                  value={selectedYear}
                  onChange={val => setSelectedYear(Number(val))}
                  options={[
                    { value: 1, label: 'Year 1 (H&S Scope)' },
                    { value: 2, label: 'Year 2' },
                    { value: 3, label: 'Year 3' },
                    { value: 4, label: 'Year 4' }
                  ]}
                  placeholder="Select Year"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Department *</label>
                <CustomSelect
                  value={selectedDeptId}
                  onChange={setSelectedDeptId}
                  options={[
                    { value: '', label: '-- Select Department --' },
                    ...filteredDepartments.map(d => ({
                      value: String(d.id),
                      label: `${d.name} (${d.code})`
                    }))
                  ]}
                  placeholder="-- Select Department --"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Section Name (e.g. A, B, Elite) *</label>
                <input
                  type="text"
                  required
                  placeholder="Section letter or name (e.g. A, Elite)..."
                  value={newSecName}
                  onChange={e => setNewSecName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <button
                type="submit"
                disabled={creating || !selectedDeptId || !newSecName.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Section'}
              </button>
            </form>
          </div>

          {/* Section & Mentor Allotment Matrix Table */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Section & Faculty Mentor Matrix ({sections.length})
              </h2>
              <span className="text-[11px] font-bold text-slate-400">Year | Dept | Sec | Mentor | Strength</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-bold uppercase tracking-wider text-slate-400 animate-pulse">
                Loading allotment matrix...
              </div>
            ) : sections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">No sections configured.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Year & Section</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Assigned Mentor</th>
                      <th className="py-3 px-3">Student Strength</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                    {sections.map(s => {
                      const dept = departments.find(d => d.id === s.department_id);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800 text-[10px] uppercase">
                              Year {s.year || 1}
                            </span>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">Sec {s.name}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                            {dept ? `${dept.name} (${dept.code})` : 'Dept'}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {s.mentor_name ? (
                              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 w-max">
                                <UserCheck size={13} /> {s.mentor_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                              {s.student_count || 0} Students
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setAssigningSection(s)}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-extrabold border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <Edit3 size={13} /> Assign Mentor
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Bulk Section Shuffle Wizard */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-500" /> Upload Section Shuffle CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload CSV with headers <code className="font-mono text-emerald-600 dark:text-emerald-400">admn_no, new_section</code> to update student section allocations.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Download Sample CSV
            </button>
          </div>

          {!previewData ? (
            <div className="space-y-4 max-w-xl mx-auto">
              <FileDropZone
                onFileSelect={setCsvFile}
                selectedFile={csvFile}
                accept=".csv"
                title="Drag and drop Section Shuffle CSV file"
              />
              <button
                onClick={handleValidateCSV}
                disabled={!csvFile || validating}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {validating ? 'Validating CSV...' : 'Validate & Preview Shuffle'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <span>Total Records: {previewData.total_records} | Valid: {previewData.valid_count} | Errors: {previewData.error_count}</span>
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Reset File
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleCommitShuffle}
                  disabled={committing || previewData.valid_count === 0}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {committing ? 'Applying Changes...' : `Commit ${previewData.valid_count} Section Updates`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mentor Assignment Modal */}
      {assigningSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="text-indigo-500" size={18} /> Assign Mentor — Section {assigningSection.name}
              </h3>
              <button onClick={() => setAssigningSection(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignMentor} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Select Faculty Mentor *</label>
                <CustomSelect
                  value={selectedMentorId}
                  onChange={setSelectedMentorId}
                  options={mentorUsers.map((u: any) => ({
                    value: String(u.id),
                    label: `${u.full_name || u.username} (${u.role.toUpperCase()})`
                  }))}
                  placeholder="Select Faculty Mentor"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningSection(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMentor || !selectedMentorId}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  {savingMentor ? 'Saving...' : 'Apply Mentor Allotment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
