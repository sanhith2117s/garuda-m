import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import CustomSelect from '../../components/CustomSelect';
import { showConfirm, showAlert } from '../../utils/modal';
import { Network, Plus, RefreshCw, UserCheck, Trash2, Users, Edit3, X, AlertCircle } from 'lucide-react';

export default function DepartmentsPage() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [departments, setDepartments] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [hodUsers, setHodUsers] = useState<any[]>([]);
  const [hodAssignments, setHodAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetCollegeId, setTargetCollegeId] = useState<number | string>(collegeId || 1);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isHs, setIsHs] = useState(false);
  const [msg, setMsg] = useState('');

  // Allotment Modal State
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [selectedHodId, setSelectedHodId] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<{ [key: number]: boolean }>({
    1: false,
    2: false,
    3: false,
    4: false
  });
  const [savingAllotment, setSavingAllotment] = useState(false);

  const fetchDepartments = () => {
    setLoading(true);
    const colParam = targetCollegeId ? `?college_id=${targetCollegeId}` : '';
    axios.get(`/api/admin/departments${colParam}`, { headers })
      .then(res => setDepartments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchHodAssignments = () => {
    const colParam = targetCollegeId ? `?college_id=${targetCollegeId}` : '';
    axios.get(`/api/admin/hod-assignments${colParam}`, { headers })
      .then(res => setHodAssignments(res.data || []))
      .catch(() => setHodAssignments([]));
  };

  const fetchCollegesAndUsers = () => {
    axios.get('/api/admin/colleges', { headers })
      .then(res => setColleges(res.data))
      .catch(() => {});

    axios.get('/api/admin/users', { headers })
      .then(res => {
        const users = Array.isArray(res.data) ? res.data : (res.data.items || []);
        setHodUsers(users.filter((u: any) => u.role === 'hod' || u.role === 'admin' || u.role === 'super_admin'));
      })
      .catch(() => setHodUsers([]));
  };

  useEffect(() => {
    fetchCollegesAndUsers();
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchHodAssignments();
  }, [targetCollegeId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await axios.post('/api/admin/departments', {
        college_id: Number(targetCollegeId),
        name,
        code,
        is_hs: isHs
      }, { headers });
      setMsg('Department created successfully!');
      setName('');
      setCode('');
      setIsHs(false);
      fetchDepartments();
      fetchHodAssignments();
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Failed to create department.');
    }
  };

  const handleDeleteDept = async (id: number, deptName: string) => {
    const confirmed = await showConfirm('Delete Department', `Are you sure you want to delete department '${deptName}'?`);
    if (!confirmed) return;

    try {
      await axios.delete(`/api/admin/departments/${id}`, { headers });
      showAlert('Success', `Department '${deptName}' deleted successfully.`);
      fetchDepartments();
      fetchHodAssignments();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to delete department.');
    }
  };

  const openAllotmentModal = (dept: any) => {
    setSelectedDept(dept);
    setSelectedHodId('');
    if (dept.is_hs) {
      setSelectedYears({ 1: true, 2: false, 3: false, 4: false });
    } else {
      setSelectedYears({ 1: false, 2: true, 3: true, 4: true });
    }
  };

  const handleSaveHODAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !selectedHodId) return;

    const checkedYearNums = Object.keys(selectedYears)
      .map(Number)
      .filter(yr => selectedYears[yr]);

    if (checkedYearNums.length === 0) {
      showAlert('Error', 'Please select at least one year checkbox for HOD allotment.');
      return;
    }

    const selectedHodUser = hodUsers.find(u => String(u.id) === String(selectedHodId));
    const hodName = selectedHodUser ? selectedHodUser.full_name || selectedHodUser.username : 'Selected HOD';

    const confirmed = await showConfirm(
      'Confirm HOD Allotment Change',
      `Assign ${hodName} as HOD for ${selectedDept.code} for Year(s): ${checkedYearNums.join(', ')}? Existing section mentor fallback rules for these years will route to this HOD.`
    );
    if (!confirmed) return;

    setSavingAllotment(true);
    try {
      await axios.post('/api/admin/hod-assignments', {
        department_id: selectedDept.id,
        hod_id: Number(selectedHodId),
        years: checkedYearNums
      }, { headers });

      showAlert('Success', `HOD Allotment updated successfully for ${selectedDept.code} (Years ${checkedYearNums.join(', ')})!`);
      setSelectedDept(null);
      fetchDepartments();
      fetchHodAssignments();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to update HOD allotment.');
    } finally { setSavingAllotment(false); }
  };

  const handleRemoveHODAssignment = async (assignmentId: number, slotName: string, hodName: string) => {
    const confirmed = await showConfirm(
      'Confirm HOD Allotment Removal',
      `Are you sure you want to remove HOD '${hodName}' from ${slotName}? This action requires confirmation.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`/api/admin/hod-assignments/${assignmentId}`, { headers });
      showAlert('Success', `HOD unassigned from ${slotName}.`);
      fetchDepartments();
      fetchHodAssignments();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to remove HOD allotment.');
    }
  };

  const getAssignmentsForDeptYear = (deptId: number, yearNum: number) => {
    return hodAssignments.filter(a => a.department_id === deptId && (a.year === yearNum || a.year === null));
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="text-emerald-600 dark:text-emerald-400" />
            Academic Departments & Year-Wise HOD Allotments
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Manage academic departments and assign separate Year-Wise HODs (Years 2, 3, 4)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-56">
            <CustomSelect
              value={targetCollegeId}
              onChange={val => setTargetCollegeId(val)}
              options={[
                { value: '', label: 'All Colleges (KMEC & NGIT)' },
                ...colleges.map((c: any) => ({
                  value: String(c.id),
                  label: `${c.name} (${c.code})`
                }))
              ]}
              placeholder="Select College"
            />
          </div>
          <button
            onClick={() => { fetchDepartments(); fetchHodAssignments(); }}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Department Creation Form */}
      <form onSubmit={handleCreate} className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Plus size={16} className="text-emerald-500" /> Add New Department
        </h3>

        {msg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Computer Science & Engineering"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. CSE"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white uppercase"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isHsCheck"
              checked={isHs}
              onChange={e => setIsHs(e.target.checked)}
              className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
            />
            <label htmlFor="isHsCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Designate as 1st-Year H&S Department
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 uppercase tracking-wider cursor-pointer"
        >
          Save Department
        </button>
      </form>

      {/* Dept List with Year-Wise HOD Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((d: any) => {
          const hasStudents = (d.student_count || 0) > 0;
          const colCode = d.college_id === 1 ? 'KMEC' : (d.college_id === 2 ? 'NGIT' : (colleges.find((c: any) => c.id === d.college_id)?.code || ''));
          return (
            <div key={d.id} className="bg-white dark:bg-[#162032] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {d.code}
                    </span>
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {colCode}
                    </span>
                    {d.is_hs && (
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        H&S (1st Year)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAllotmentModal(d)}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-extrabold border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 size={13} /> Manage HODs
                    </button>
                    <button
                      onClick={() => handleDeleteDept(d.id, d.name)}
                      disabled={hasStudents}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        hasStudents
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer'
                      }`}
                      title={hasStudents ? `Cannot delete (${d.student_count} enrolled students)` : 'Delete Department'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-3">{d.name}</h3>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Users size={14} className="text-emerald-500" />
                    Enrolled Students: <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{d.student_count || 0}</strong>
                  </span>
                </div>
              </div>

              {/* Separate Year-Wise HOD Allotments Display (Years 2, 3, 4 separated!) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Separate Year-Wise HOD Allotments</p>

                {d.is_hs ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                    <span className="font-extrabold text-amber-800 dark:text-amber-200 text-xs">Year 1 (H&S Head)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{d.hod1_name || "Unassigned"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {[2, 3, 4].map(yrNum => {
                      const assigns = getAssignmentsForDeptYear(d.id, yrNum);
                      const assignObj = assigns[0];
                      const hodName = assignObj ? assignObj.hod_name : (yrNum <= 3 ? d.hod1_name : d.hod2_name);
                      return (
                        <div key={yrNum} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Year {yrNum} HOD</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{hodName || "Unassigned"}</span>
                            {assignObj && (
                              <button
                                onClick={() => handleRemoveHODAssignment(assignObj.id, `Year ${yrNum} HOD`, assignObj.hod_name)}
                                className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                                title={`Remove Year ${yrNum} HOD`}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage HOD Allotments Modal with Checkboxes for Year 2, 3, 4 */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="text-emerald-500" size={18} /> Manage HOD Allotments — {selectedDept.code}
              </h3>
              <button onClick={() => setSelectedDept(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHODAllotment} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Select HOD Account *</label>
                <CustomSelect
                  value={selectedHodId}
                  onChange={val => setSelectedHodId(val)}
                  options={hodUsers.map((u: any) => ({
                    value: String(u.id),
                    label: `${u.full_name || u.username} (${u.role.toUpperCase()})`
                  }))}
                  placeholder="Select HOD User"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Select Target Year Allotments * (Separate Checkboxes)
                </label>
                {selectedDept.is_hs ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                    <input
                      type="checkbox"
                      id="yr1"
                      checked={selectedYears[1]}
                      onChange={e => setSelectedYears({ ...selectedYears, 1: e.target.checked })}
                      className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="yr1" className="text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
                      Year 1 (H&S Scope)
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map(yr => (
                      <label key={yr} className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedYears[yr]
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedYears[yr]}
                          onChange={e => setSelectedYears({ ...selectedYears, [yr]: e.target.checked })}
                          className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
                        />
                        <span>Year {yr}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <span>Assigning or replacing an HOD requires explicit confirmation. Section mentors for these years will route fallback requests to this HOD.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDept(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAllotment || !selectedHodId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  {savingAllotment ? 'Updating...' : 'Apply HOD Allotment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
