import React, { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import FileDropZone from '../../components/FileDropZone';
import {
  Upload, FileText, Archive, Users, CheckCircle, AlertTriangle,
  XCircle, Info, ChevronDown, ChevronUp, Loader2, UserPlus, ArrowRightLeft
} from 'lucide-react';

function Collapsible({ title, count, color, children }: {
  title: string; count: number; color: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(count > 0 && count <= 5);
  if (count === 0) return null;
  return (
    <div className={`rounded-2xl border ${color} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-[12px] font-black uppercase tracking-widest">{title} ({count})</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="px-5 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

export default function StudentOnboardingPage() {
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [activeTab, setActiveTab] = useState<'bulk' | 'single'>('bulk');
  const [targetCollegeId, setTargetCollegeId] = useState<number | string>(collegeId || 1);
  const [targetSemester, setTargetSemester] = useState<number>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OnboardReport | null>(null);
  const [error, setError] = useState('');

  // Single student form state
  const [singleRoll, setSingleRoll] = useState('');
  const [singleAdmn, setSingleAdmn] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleBranch, setSingleBranch] = useState('CSE');
  const [singleSection, setSingleSection] = useState('A');
  const [singleSemester, setSingleSemester] = useState(1);
  const [singleMsg, setSingleMsg] = useState('');
  const [singleErr, setSingleErr] = useState('');

  const [colleges, setColleges] = useState<any[]>([]);

  React.useEffect(() => {
    if (role === 'super_admin') {
      axios.get('/api/admin/colleges', { headers })
        .then(r => setColleges(r.data))
        .catch(() => { });
    }
  }, [role]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleMsg('');
    setSingleErr('');

    const rollClean = singleRoll.trim().toUpperCase();
    const admnClean = singleAdmn.trim();

    // Enforce 12-char roll_number and digits 3-4 validation (53 for NGIT, 55 for KMEC)
    if (rollClean.length !== 12) {
      setSingleErr('Roll Number must be exactly 12 characters long.');
      return;
    }
    const codeDigits = rollClean.slice(2, 4);
    if (codeDigits !== '53' && codeDigits !== '55') {
      setSingleErr('Invalid Roll Number college code! Digits 3-4 must be "53" for NGIT (e.g. 245324733255) or "55" for KMEC (e.g. 245525733187).');
      return;
    }
    if (admnClean && !/^\d{4,6}$/.test(admnClean)) {
      setSingleErr('Admission Number must be 4 to 6 digits (e.g. 1241 or 123456).');
      return;
    }

    try {
      await axios.post('/api/admin/students/single', {
        college_id: Number(targetCollegeId),
        roll_number: rollClean,
        admn_no: admnClean || rollClean,
        full_name: singleName.trim(),
        semester: singleSemester,
        branch: singleBranch,
        section: singleSection,
        status: 'active'
      }, { headers });
      setSingleMsg(`Student ${rollClean} added successfully!`);
      setSingleRoll('');
      setSingleAdmn('');
      setSingleName('');
    } catch (err: any) {
      setSingleErr(err.response?.data?.detail || 'Failed to add student.');
    }
  };

  const [entryType, setEntryType] = useState<EntryType>('new');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) { setError('Please select a CSV file.'); return; }
    setError(''); setLoading(true); setReport(null);

    const fd = new FormData();
    fd.append('entry_type', entryType);
    fd.append('college_id', String(targetCollegeId));
    fd.append('csv_file', csvFile);
    if (zipFile) fd.append('photos_zip', zipFile);

    try {
      const res = await axios.post('/api/admin/students/onboard', fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setReport(res.data);
    } catch (err: any) {
      let errMsg = 'Upload failed. Please check your files and try again.';
      const detail = err.response?.data?.detail;
      if (detail) {
        if (typeof detail === 'string') {
          errMsg = detail;
        } else if (Array.isArray(detail)) {
          errMsg = detail.map((d: any) => `${d.loc ? d.loc.join(' → ') + ': ' : ''}${d.msg || JSON.stringify(d)}`).join(' | ');
        } else if (typeof detail === 'object') {
          errMsg = JSON.stringify(detail);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    }
    setLoading(false);
  };

  const StatCard = ({ value, label, icon: Icon, color }: {
    value: number; label: string; icon: React.ElementType; color: string;
  }) => (
    <div className={`p-5 rounded-2xl border ${color} text-center`}>
      <Icon size={20} className="mx-auto mb-2 opacity-60" />
      <p className="text-2xl font-black mb-1">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500 font-sans">

      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mb-0.5">
            <Users className="text-[#E8752D] dark:text-[#FB923C]" size={20} /> Student Onboarding
          </h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Register students via Bulk CSV Upload or Single Student Addition
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${activeTab === 'bulk' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
          >
            Bulk CSV Onboarding
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${activeTab === 'single' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
          >
            Single Student Addition
          </button>
        </div>
      </div>

      {activeTab === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="bg-white dark:bg-[#162032] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <UserPlus size={16} className="text-emerald-500" /> Add Single Student Record
          </h3>

          {singleMsg && <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">{singleMsg}</div>}
          {singleErr && <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-200">{singleErr}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {role === 'super_admin' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target College</label>
                <CustomSelect
                  value={targetCollegeId}
                  onChange={val => setTargetCollegeId(val)}
                  options={colleges.map((c: any) => ({
                    value: String(c.id),
                    label: `${c.name} (${c.code})`
                  }))}
                  placeholder="Select College"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Roll Number (12 Characters) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="e.g. 245324733255"
                value={singleRoll}
                onChange={e => setSingleRoll(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm font-semibold uppercase text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Admission Number (4 to 6 Digits)
              </label>
              <input
                type="text"
                placeholder="e.g. 1241"
                value={singleAdmn}
                onChange={e => setSingleAdmn(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. JOHN DOE"
                value={singleName}
                onChange={e => setSingleName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
              <CustomSelect
                value={singleSemester}
                onChange={val => setSingleSemester(Number(val))}
                options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({
                  value: String(s),
                  label: `Semester ${s}`
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Branch</label>
              <input
                type="text"
                placeholder="e.g. CSE"
                value={singleBranch}
                onChange={e => setSingleBranch(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold uppercase text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Section</label>
              <input
                type="text"
                placeholder="e.g. A"
                value={singleSection}
                onChange={e => setSingleSection(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold uppercase text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-8 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 uppercase tracking-wider"
          >
            Add Student
          </button>
        </form>
      ) : (
        /* Bulk CSV Form */
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">

          {/* Entry Type Selection */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Admission Stream / Entry Type *</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setEntryType('new')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${entryType === 'new'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">Regular Entry</span>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Semester 1 (1st Year)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Standard 4-year intake starting in 1st Semester</p>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('lateral')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${entryType === 'lateral'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">Lateral Entry</span>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    Semester 3 (2nd Year)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Direct second-year admission starting in 3rd Semester</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {role === 'super_admin' && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target College</p>
                <CustomSelect
                  value={targetCollegeId}
                  onChange={val => setTargetCollegeId(val)}
                  options={colleges.map((c: any) => ({
                    value: String(c.id),
                    label: `${c.name} (${c.code})`
                  }))}
                  placeholder="Select College"
                />
              </div>
            )}
          </div>

          {/* File uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Students CSV <span className="text-rose-500">*</span>
              </p>
              <FileDropZone
                label="Drop or click to upload CSV"
                accept=".csv"
                icon={FileText}
                file={csvFile}
                onChange={setCsvFile}
                hint="admn_no, roll_number, full_name, password, branch, section"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Photos ZIP <span className="text-slate-300">(optional)</span>
              </p>
              <FileDropZone
                label="Drop or click to upload ZIP"
                accept=".zip"
                icon={Archive}
                file={zipFile}
                onChange={setZipFile}
                hint="Photos named roll_number.jpg inside a ZIP archive"
              />
            </div>
          </div>

          {/* CSV format hint */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Info size={12} /> CSV Format & Roll Number Reference
            </p>
            <code className="text-[11px] text-slate-700 dark:text-slate-200 font-mono break-all block p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
              admn_no,roll_number,full_name,branch,section,semester
            </code>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
              • <strong>Required Columns:</strong> <code className="text-emerald-600 dark:text-emerald-400 font-bold">admn_no</code>, <code className="text-emerald-600 dark:text-emerald-400 font-bold">roll_number</code>, <code className="text-emerald-600 dark:text-emerald-400 font-bold">full_name</code>.<br />
              • <strong>Roll Number Format:</strong> Exactly 12 characters.<br />
              • <strong>College Code Rule:</strong> Digits 3 & 4 must be <code className="text-indigo-600 font-bold">53</code> for NGIT (e.g. <code>245324733255</code>) or <code className="text-indigo-600 font-bold">55</code> for KMEC (e.g. <code>245525733187</code>).
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-5 py-4 text-[12px] font-bold flex items-center gap-2">
              <XCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || !csvFile}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#E8752D] hover:bg-[#D96622] text-white font-black text-[12px] uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-600/20 disabled:opacity-40 transition-all cursor-pointer"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Upload size={16} /> Start Onboarding</>}
          </button>
        </form>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">

          {/* Summary stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-[13px] font-black text-slate-900 mb-4 flex items-center gap-2">
              Onboarding Report —&nbsp;
              <span className="text-[#7e3af2]">
                {report.summary.entry_type === 'new' ? 'New Students' : 'Lateral Entry'}&nbsp;
                (→ Semester {report.summary.target_semester})
              </span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard value={report.summary.total_csv_rows} label="CSV Rows" icon={FileText} color="border-slate-200 text-slate-600" />
              <StatCard value={report.summary.added} label="Added ✓ Photo" icon={CheckCircle} color="border-emerald-200 text-emerald-700 bg-emerald-50" />
              <StatCard value={report.summary.added_no_photo} label="Added, No Photo" icon={AlertTriangle} color="border-amber-200 text-amber-700 bg-amber-50" />
              <StatCard value={report.summary.duplicates_skipped} label="Duplicates" icon={XCircle} color="border-rose-200 text-rose-700 bg-rose-50" />
              <StatCard value={report.summary.invalid_rows} label="Invalid Rows" icon={XCircle} color="border-rose-200 text-rose-700 bg-rose-50" />
              <StatCard value={report.summary.photos_without_data} label="Photo, No Data" icon={AlertTriangle} color="border-amber-200 text-amber-700 bg-amber-50" />
            </div>
          </div>

          {/* Detail sections */}
          <div className="space-y-3">
            <Collapsible title="Successfully Added (with photo)" count={report.details.added.length}
              color="border-emerald-200 bg-emerald-50 text-emerald-700">
              {report.details.added.map(s => (
                <div key={s.roll_number} className="text-[12px] font-bold flex gap-3">
                  <span className="font-mono text-emerald-500">{s.roll_number}</span>
                  <span>{s.name}</span>
                </div>
              ))}
            </Collapsible>

            <Collapsible title="Added — Photo Missing" count={report.details.added_no_photo.length}
              color="border-amber-200 bg-amber-50 text-amber-700">
              {report.details.added_no_photo.map(s => (
                <div key={s.roll_number} className="text-[12px] font-bold flex gap-3">
                  <span className="font-mono text-amber-500">{s.roll_number}</span>
                  <span>{s.name}</span>
                  <span className="opacity-50">({s.note})</span>
                </div>
              ))}
            </Collapsible>

            <Collapsible title="Duplicates Skipped" count={report.details.duplicates.length}
              color="border-rose-200 bg-rose-50 text-rose-700">
              {report.details.duplicates.map((d, i) => (
                <div key={i} className="text-[12px] font-bold flex gap-3">
                  <span className="font-mono text-rose-400">Row {d.row}</span>
                  <span>{d.roll_number}</span>
                  <span className="opacity-60">— {d.reason}</span>
                </div>
              ))}
            </Collapsible>

            <Collapsible title="Invalid Rows (Missing Fields)" count={report.details.invalid_rows.length}
              color="border-rose-200 bg-rose-50 text-rose-700">
              {report.details.invalid_rows.map((r, i) => (
                <div key={i} className="text-[12px] font-bold flex gap-3">
                  <span className="font-mono text-rose-400">Row {r.row}</span>
                  <span className="opacity-60">— {r.reason}</span>
                </div>
              ))}
            </Collapsible>

            <Collapsible title="Photos Without Matching CSV Data" count={report.details.photos_without_data.length}
              color="border-amber-200 bg-amber-50 text-amber-700">
              {report.details.photos_without_data.map((r, i) => (
                <div key={i} className="text-[12px] font-bold font-mono text-amber-600">{r}</div>
              ))}
            </Collapsible>

            <Collapsible title="Photo Extraction Errors" count={report.details.photo_errors.length}
              color="border-rose-200 bg-rose-50 text-rose-700">
              {report.details.photo_errors.map((e, i) => (
                <div key={i} className="text-[12px] font-bold flex gap-3">
                  <span className="font-mono text-rose-400">{e.file}</span>
                  <span className="opacity-60">— {e.reason}</span>
                </div>
              ))}
            </Collapsible>
          </div>
        </div>
      )}
    </div>
  );
}
