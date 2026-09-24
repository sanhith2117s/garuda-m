import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import StudentHistoryModal from '../../components/StudentHistoryModal';
import { toast } from '../../utils/toast';
import { showConfirm } from '../../utils/modal';
import { Search, User, Edit3, Upload, RefreshCw, X, Filter, FileSpreadsheet, ShieldAlert, CheckCircle2, Phone, Building2, Trash2, FileText } from 'lucide-react';

interface StudentData {
  id: number;
  full_name: string;
  roll_number: string;
  admn_no: string;
  semester: number;
  branch: string;
  section: string;
  parent_phone?: string;
  secondary_phone?: string;
  photo_url: string;
  status?: string;
  status_notes?: string;
}

export default function StudentDirectoryPage() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // State
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedHistoryRoll, setSelectedHistoryRoll] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 25, 50, 100, 0 (All)
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [secFilter, setSecFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Edit Modal State
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    section: '',
    branch: '',
    semester: 1,
    status: 'active',
    status_notes: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk CSV Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const fetchDirectory = () => {
    setLoading(true);
    let params = [];
    if (search.trim()) params.push(`search=${encodeURIComponent(search.trim())}`);
    if (collegeId) params.push(`college_id=${collegeId}`);
    if (semFilter) params.push(`semester=${semFilter}`);
    if (branchFilter) params.push(`branch=${encodeURIComponent(branchFilter)}`);
    if (secFilter) params.push(`section=${encodeURIComponent(secFilter)}`);
    if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
    params.push(`page=${page}`);
    if (pageSize > 0) params.push(`limit=${pageSize}`);

    const queryString = params.length > 0 ? `?${params.join('&')}` : '';

    axios.get(`/api/admin/directory${queryString}`, { headers })
      .then(r => {
        if (r.data && Array.isArray(r.data.items)) {
          setStudents(r.data.items);
          setTotalStudents(r.data.total || r.data.items.length);
          setTotalPages(r.data.pages || 1);
        } else if (Array.isArray(r.data)) {
          setStudents(r.data);
          setTotalStudents(r.data.length);
          setTotalPages(1);
        } else {
          setStudents([]);
          setTotalStudents(0);
          setTotalPages(1);
        }
      })
      .catch(() => {
        setStudents([]);
        setTotalStudents(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [search, semFilter, branchFilter, secFilter, statusFilter, pageSize]);

  useEffect(() => {
    fetchDirectory();
  }, [collegeId, search, semFilter, branchFilter, secFilter, statusFilter, page, pageSize]);

  // Open Edit Modal
  const handleOpenEdit = (stud: StudentData) => {
    setEditStudent(stud);
    setEditForm({
      full_name: stud.full_name || '',
      section: stud.section || '',
      branch: stud.branch || '',
      semester: stud.semester || 1,
      status: stud.status || 'active',
      status_notes: stud.status_notes || ''
    });
  };

  // Save Student Edit
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setSavingEdit(true);

    try {
      await axios.patch(`/api/admin/directory/${editStudent.id}`, editForm, { headers });
      toast.success(`Updated student ${editStudent.roll_number} successfully!`);
      setEditStudent(null);
      fetchDirectory();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update student details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStudent = async (stud: StudentData) => {
    const confirmed = await showConfirm(
      'Delete Student Record',
      `Are you sure you want to permanently delete student '${stud.full_name}' (${stud.roll_number})? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`/api/admin/directory/${stud.id}`, { headers });
      toast.success(`Deleted student ${stud.roll_number} successfully.`);
      fetchDirectory();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete student.');
    }
  };

  // Upload Bulk Update CSV
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file to upload.');
      return;
    }
    setUploadingBulk(true);
    setBulkResult(null);

    const formData = new FormData();
    formData.append('csv_file', csvFile);

    try {
      const res = await axios.post('/api/admin/directory/bulk-update-csv', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setBulkResult(res.data);
      toast.success(`Bulk update complete: ${res.data.updated_count} students updated!`);
      fetchDirectory();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Bulk update failed.');
    } finally {
      setUploadingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-slate-900 dark:text-white font-black text-2xl tracking-tight">Student Directory</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">Browse, edit, and bulk update student records</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Upload size={15} /> Bulk Update CSV
          </button>
          <button
            onClick={fetchDirectory}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-3.5 text-[#E8752D] dark:text-[#FB923C]" />
          <input
            type="text"
            placeholder="Search by Roll Number, Admission No, or Student Name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {/* Multi-Field Dropdown Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Semester</label>
            <CustomSelect
              value={semFilter}
              onChange={val => setSemFilter(val)}
              options={[
                { value: '', label: 'All Semesters' },
                ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: String(s), label: `Semester ${s}` }))
              ]}
              placeholder="All Semesters"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Branch</label>
            <CustomSelect
              value={branchFilter}
              onChange={val => setBranchFilter(val)}
              options={[
                { value: '', label: 'All Branches' },
                { value: 'CSE', label: 'CSE' },
                { value: 'CSM', label: 'CSM (AI & ML)' },
                { value: 'H&S', label: 'Humanities & Sciences' }
              ]}
              placeholder="All Branches"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Section</label>
            <CustomSelect
              value={secFilter}
              onChange={val => setSecFilter(val)}
              options={[
                { value: '', label: 'All Sections' },
                { value: 'A', label: 'Section A' },
                { value: 'B', label: 'Section B' },
                { value: 'C', label: 'Section C' },
                { value: 'D', label: 'Section D' },
                { value: 'E', label: 'Section E' }
              ]}
              placeholder="All Sections"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Status</label>
            <CustomSelect
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              options={[
                { value: 'active', label: '🟢 Active Only' },
                { value: 'all', label: '🌐 All Statuses' },
                { value: 'tc_taken', label: '📄 TC Taken' },
                { value: 'rusticated', label: '🔴 Rusticated' }
              ]}
              placeholder="Active Only"
            />
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
            Loading student directory...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-bold">
            No students found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Branch & Sec</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                {students.map(stud => (
                  <tr key={stud.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                        <img
                          src={stud.photo_url}
                          alt={stud.full_name}
                          className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(stud.full_name)}&background=6366f1&color=fff`; }}
                        />
                      </div>
                      <span>{stud.full_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {(stud.roll_number && (stud.roll_number.includes('NG') || stud.roll_number.includes('53')) ? 'NGIT' : 'KMEC')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">{stud.roll_number}</td>
                    <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {stud.branch || '—'} {stud.section ? `- ${stud.section}` : ''}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">Sem {stud.semester || 1}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        stud.status === 'rusticated' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300' :
                        stud.status === 'tc_taken' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {stud.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedHistoryRoll(stud.roll_number)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-extrabold border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                      >
                        <FileText size={13} /> History
                      </button>
                      <button
                        onClick={() => handleOpenEdit(stud)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-extrabold border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(stud)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-extrabold border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                        title="Delete Student Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Directory Pagination Bar */}
        {students.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={0}>All Records</option>
              </select>
              <span>
                Showing {pageSize > 0 ? (page - 1) * pageSize + 1 : 1} to {pageSize > 0 ? Math.min(page * pageSize, totalStudents) : totalStudents} of {totalStudents} students
              </span>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Previous
                </button>

                <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold rounded-xl border border-indigo-200 dark:border-indigo-800">
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pop-Up Student Edit Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Edit Student Profile</h3>
                  <p className="text-xs font-mono text-slate-400">{editStudent.roll_number}</p>
                </div>
              </div>
              <button onClick={() => setEditStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Section</label>
                  <CustomSelect
                    value={editForm.section}
                    onChange={val => setEditForm({ ...editForm, section: val })}
                    options={[
                      { value: 'A', label: 'Section A' },
                      { value: 'B', label: 'Section B' },
                      { value: 'C', label: 'Section C' },
                      { value: 'D', label: 'Section D' },
                      { value: 'E', label: 'Section E' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Branch</label>
                  <CustomSelect
                    value={editForm.branch}
                    onChange={val => setEditForm({ ...editForm, branch: val })}
                    options={[
                      { value: 'CSE', label: 'CSE' },
                      { value: 'CSM', label: 'CSM (AI & ML)' },
                      { value: 'H&S', label: 'Humanities & Sciences' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Semester</label>
                  <CustomSelect
                    value={String(editForm.semester)}
                    onChange={val => setEditForm({ ...editForm, semester: Number(val) })}
                    options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: String(s), label: `Semester ${s}` }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Status</label>
                  <CustomSelect
                    value={editForm.status}
                    onChange={val => setEditForm({ ...editForm, status: val })}
                    options={[
                      { value: 'active', label: '🟢 Active' },
                      { value: 'tc_taken', label: '📄 TC Taken' },
                      { value: 'rusticated', label: '🔴 Rusticated' }
                    ]}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Administrative Notes</label>
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={editForm.status_notes}
                    onChange={e => setEditForm({ ...editForm, status_notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-Up Bulk Update CSV Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Bulk Update Students via CSV</h3>
                  <p className="text-xs text-slate-400">Update Sections, Semesters, Branches, or Names in bulk</p>
                </div>
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkResult(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5 font-medium">
                <p className="font-bold">Required CSV Header Columns:</p>
                <p className="font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900">
                  roll_number, section, semester, branch, full_name, parent_phone
                </p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 italic">
                  * Note: Only `roll_number` is required. You can include any optional column to bulk update fields!
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300 cursor-pointer"
                />
              </div>

              {bulkResult && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><CheckCircle2 size={16} /> {bulkResult.message}</p>
                  <p>Updated Count: {bulkResult.updated_count} | Failed: {bulkResult.failed_count}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowBulkModal(false); setBulkResult(null); }}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploadingBulk}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                >
                  {uploadingBulk ? 'Uploading...' : 'Execute Bulk Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedHistoryRoll && (
        <StudentHistoryModal
          studentRollOrId={selectedHistoryRoll}
          onClose={() => setSelectedHistoryRoll(null)}
        />
      )}
    </div>
  );
}
