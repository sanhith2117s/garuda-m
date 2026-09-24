import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import { Users, Key, Plus, CheckCircle, XCircle, Filter, RefreshCw, AlertTriangle, Layers, GraduationCap, Building2 } from 'lucide-react';

interface FilterData {
  branches: string[];
  semesters: number[];
  sections: string[];
}

const BULK_REASON_OPTIONS = [
  { value: 'Half Day', label: 'Half Day' },
  { value: 'Audi', label: 'Audi' },
  { value: 'Other', label: 'Other' },
];

export default function BulkManagementPage() {
  const token = useAuthStore(s => s.token);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [filters, setFilters] = useState<FilterData>({ branches: [], semesters: [], sections: [] });
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState<number | ''>('');
  const [section, setSection] = useState('');
  const [reason, setReason] = useState('Half Day');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchFilters = () => {
    axios.get('/api/admin/bulk/filters', { headers })
      .then(r => setFilters(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const handleBulkGeneratePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch && !semester && !section) {
      setFeedback({ type: 'error', message: 'Please select at least one filter (Branch, Semester, or Section).' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await axios.post('/api/bulk/generate-passes', {
        branch: branch || null,
        semester: semester !== '' ? Number(semester) : null,
        section: section || null,
        reason,
        notes,
      }, { headers });

      setFeedback({ type: 'success', message: res.data.message || 'Bulk section passes generated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to generate bulk passes.' });
    } finally {
      setLoading(false);
    }
  };

  const branchOptions = [
    { value: '', label: 'All Branches' },
    ...filters.branches.map(b => ({ value: b, label: b }))
  ];

  const semesterOptions = [
    { value: '', label: 'All Semesters' },
    ...filters.semesters.map(s => ({ value: String(s), label: `Semester ${s}` }))
  ];

  const sectionOptions = [
    { value: '', label: 'All Sections' },
    ...filters.sections.map(sec => ({ value: sec, label: `Section ${sec}` }))
  ];

  return (
    <div className="space-y-8">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-[#159A78] dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white font-black text-2xl tracking-tight">Section Pass</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">Issue and activate gate passes for entire sections or branches in one click</p>
          </div>
        </div>

        <button
          onClick={fetchFilters}
          className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-orange-600/20 transition-all cursor-pointer"
        >
          <RefreshCw size={14} /> Refresh Filters
        </button>
      </div>

      {/* Main Console */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-[#159A78] dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-white font-black text-lg tracking-tight">Bulk Gate Pass Authorization</h3>
            <p className="text-slate-400 text-xs font-medium">Select Branch, Semester, or Section to activate gate exit permissions</p>
          </div>
        </div>

        {/* Step Indicator Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Select Target Class</span>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700">
            <span className="w-6 h-6 rounded-full bg-[#E8752D] text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Choose Pass Purpose</span>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Dispatch Batch Passes</span>
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleBulkGeneratePass} className="space-y-6">
          {/* Custom Select Filter Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Branch */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                1. Select Branch
              </label>
              <CustomSelect
                value={branch}
                onChange={val => setBranch(val)}
                options={branchOptions}
                placeholder="All Branches"
              />
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                2. Select Semester
              </label>
              <CustomSelect
                value={semester !== '' ? String(semester) : ''}
                onChange={val => setSemester(val ? Number(val) : '')}
                options={semesterOptions}
                placeholder="All Semesters"
              />
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                3. Select Section
              </label>
              <CustomSelect
                value={section}
                onChange={val => setSection(val)}
                options={sectionOptions}
                placeholder="All Sections"
              />
            </div>
          </div>

          {/* Purpose & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Pass Purpose / Reason
              </label>
              <CustomSelect
                value={reason}
                onChange={val => setReason(val)}
                options={BULK_REASON_OPTIONS}
                placeholder="Select Purpose"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Administrative Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Approved bulk outing for Section A"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || (!branch && !semester && !section)}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-white transition-all shadow-lg ${
                (branch || semester || section) && !loading
                  ? 'bg-[#E8752D] hover:bg-[#D96622] shadow-orange-600/25 cursor-pointer active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Users size={18} />
              {loading ? 'Activating Section Passes...' : 'Generate & Activate Section Passes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

