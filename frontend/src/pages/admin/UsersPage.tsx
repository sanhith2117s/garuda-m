import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { Users, UserPlus, Shield, Building2, CheckCircle, XCircle, Search, RefreshCw, Trash2, Key, X, Power, UserCheck, ShieldCheck } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import { showConfirm } from '../../utils/modal';
import { toast } from '../../utils/toast';

type Tab = 'academic' | 'security';

export default function UsersPage() {
  const token = useAuthStore(s => s.token);
  const currentRole = useAuthStore(s => s.role);
  const userCollegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [activeTab, setActiveTab] = useState<Tab>('academic');
  const [users, setUsers] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCollegeId, setFilterCollegeId] = useState<string>(userCollegeId ? String(userCollegeId) : '');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'hod' | 'mentor' | 'security'>('hod');
  const [modalCollegeId, setModalCollegeId] = useState<string>(userCollegeId ? String(userCollegeId) : '1');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Edit User Role Modal State
  const [editUser, setEditUser] = useState<any | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const colParam = filterCollegeId ? `?college_id=${filterCollegeId}` : '';
      const res = await axios.get(`/api/admin/users${colParam}`, { headers });
      setUsers(res.data);
    } catch (_) {}
    setLoading(false);
  };

  const fetchCollegesAndDepts = async () => {
    try {
      const colRes = await axios.get('/api/admin/colleges', { headers });
      setColleges(colRes.data);
      if (colRes.data.length > 0 && !modalCollegeId) {
        setModalCollegeId(String(colRes.data[0].id));
      }

      const deptRes = await axios.get('/api/admin/departments', { headers });
      setDepartments(deptRes.data);
    } catch (_) {}
  };

  useEffect(() => {
    fetchUsers();
  }, [filterCollegeId]);

  useEffect(() => {
    fetchCollegesAndDepts();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const selectedColId = modalCollegeId ? Number(modalCollegeId) : null;
      await axios.post('/api/admin/users', {
        username: username.trim(),
        full_name: fullName.trim(),
        password: password.trim(),
        role,
        college_id: selectedColId,
        department_id: departmentId ? Number(departmentId) : null
      }, { headers });

      toast.success(`User '${username}' created successfully!`);
      setUsername('');
      setFullName('');
      setPassword('');
      setShowCreateModal(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean, uname: string) => {
    try {
      await axios.put(`/api/admin/users/${id}`, { is_active: !currentStatus }, { headers });
      toast.success(`User '${uname}' is now ${!currentStatus ? 'ACTIVE' : 'DEACTIVATED'}.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await axios.put(`/api/admin/users/${editUser.id}`, { role: editUser.role, full_name: editUser.full_name }, { headers });
      toast.success(`User '${editUser.username}' updated successfully.`);
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (id: number, uname: string) => {
    const confirmed = await showConfirm('Delete User', `Are you sure you want to delete user ${uname}?`);
    if (!confirmed) return;
    try {
      await axios.delete(`/api/admin/users/${id}`, { headers });
      toast.success(`User ${uname} deleted successfully.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const filteredUsers = users.filter((u: any) => {
    const isSecurity = u.role === 'security';
    if (activeTab === 'security' && !isSecurity) return false;
    if (activeTab === 'academic' && isSecurity) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.college_name && u.college_name.toLowerCase().includes(term)) ||
      (u.department_name && u.department_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-500">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="text-emerald-600 dark:text-emerald-400" size={24} /> User Accounts & Roles
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Manage Administrators, Department HODs, Mentors, and Gate Security Staff
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentRole === 'super_admin' && (
            <div className="w-52">
              <CustomSelect
                value={filterCollegeId}
                onChange={val => setFilterCollegeId(val)}
                options={[
                  { value: '', label: 'All Colleges (KMEC & NGIT)' },
                  ...colleges.map((c: any) => ({ value: String(c.id), label: `${c.name} (${c.code})` }))
                ]}
                placeholder="Filter by College"
              />
            </div>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={16} /> Create User
          </button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-1.5 shadow-inner border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('academic')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'academic'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck size={14} /> Academic Faculty ({users.filter(u => u.role !== 'security').length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck size={14} /> Gate Security Personnel ({users.filter(u => u.role === 'security').length})
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, role, college..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
          Loading Users Directory...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200/80 dark:border-slate-700/60 p-12 text-center text-slate-400 font-bold text-xs">
          No users found in this tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u: any) => {
            const roleBadge = u.role === 'super_admin' ? 'bg-amber-500 text-white' :
              (u.role === 'admin' ? 'bg-purple-600 text-white' :
                (u.role === 'hod' ? 'bg-emerald-600 text-white' :
                  (u.role === 'mentor' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white')));

            return (
              <div key={u.id} className="bg-white dark:bg-[#162032] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${roleBadge}`}>
                      {u.role.replace('_', ' ')}
                    </span>

                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active, u.username)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                        u.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <Power size={12} /> {u.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-3">{u.full_name || u.username}</h3>
                  <p className="text-xs font-semibold text-slate-400 font-mono">@{u.username}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <p className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-emerald-500 shrink-0" />
                      <span>{u.college_name || 'Global System'}</span>
                    </p>
                    {u.department_name && (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        <UserCheck size={14} className="shrink-0" />
                        <span>HOD of {u.department_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setEditUser(u)}
                    className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline uppercase cursor-pointer"
                  >
                    Edit Role
                  </button>

                  <button
                    onClick={() => handleDeleteUser(u.id, u.username)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Delete User"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create User Modal Popup */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-500" /> Create New User Account
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                <CustomSelect
                  value={role}
                  onChange={(val: any) => setRole(val)}
                  options={[
                    { value: 'admin', label: 'College Admin' },
                    { value: 'hod', label: 'Department HOD' },
                    { value: 'mentor', label: 'Faculty Mentor' },
                    { value: 'security', label: 'Gate Security Staff' },
                  ]}
                  placeholder="Select Role"
                />
              </div>

              {currentRole === 'super_admin' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">College *</label>
                  <CustomSelect
                    value={modalCollegeId}
                    onChange={val => setModalCollegeId(val)}
                    options={colleges.map((c: any) => ({
                      value: String(c.id),
                      label: `${c.name} (${c.code})`
                    }))}
                    placeholder="Select College"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DR. RAMESH RAO"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hod_cse_kmec"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal Popup */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Edit User: {editUser.username}
              </h3>
              <button
                onClick={() => setEditUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editUser.full_name || ''}
                  onChange={e => setEditUser({ ...editUser, full_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Role Assignment</label>
                <CustomSelect
                  value={editUser.role}
                  onChange={val => setEditUser({ ...editUser, role: val })}
                  options={[
                    { value: 'admin', label: 'College Admin' },
                    { value: 'hod', label: 'Department HOD' },
                    { value: 'mentor', label: 'Faculty Mentor' },
                    { value: 'security', label: 'Gate Security Staff' },
                  ]}
                  placeholder="Select Role"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
