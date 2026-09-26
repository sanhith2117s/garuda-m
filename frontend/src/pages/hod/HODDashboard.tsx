import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, ShieldCheck, UtensilsCrossed, Clock, GraduationCap, Menu, X,
  UserCheck, Users, Key, Sparkles, Calendar, ChevronDown, Lock,
  Building2, PanelLeftClose, PanelLeftOpen, QrCode, Shuffle, UserPlus, AlertTriangle
} from 'lucide-react';
import logo from '../../assets/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import NotificationCenter from '../../components/NotificationCenter';
import { showAlert } from '../../utils/modal';

// Sub-pages
import PassGeneratorPage from '../admin/PassGeneratorPage';
import GatePassPage from '../admin/GatePassPage';
import LunchPassPage from '../admin/LunchPassPage';
import LateComersPage from '../admin/LateComersPage';
import CustomPassPage from '../admin/CustomPassPage';
import SectionsPage from '../admin/SectionsPage';
import FacultyAllotmentsPage from '../admin/FacultyAllotmentsPage';
import StudentDirectoryPage from '../admin/StudentDirectoryPage';

type HODSubPage =
  | 'pass_generator'
  | 'gatepass'
  | 'lunch'
  | 'latecomers'
  | 'custom_pass'
  | 'sections'
  | 'faculty_allotments'
  | 'directory';

export default function HODDashboard() {
  const token = useAuthStore(s => s.token);
  const fullName = useAuthStore(s => s.fullName);
  const username = useAuthStore(s => s.username);
  const collegeCode = useAuthStore(s => s.collegeCode);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [activePage, setActivePage] = useState<HODSubPage>('pass_generator');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('garuda_hod_sidebar_collapsed') === 'true';
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Pass Operations': true,
    'Academic & Section Mgmt': true,
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  // Absence modal state
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [reason, setReason] = useState('');
  const [absenceStart, setAbsenceStart] = useState('');
  const [absenceEnd, setAbsenceEnd] = useState('');
  const [savingAbsence, setSavingAbsence] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('garuda_hod_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const fetchAbsenceStatus = async () => {
    try {
      const res = await axios.get('/api/hod/absence', { headers });
      setIsUnavailable(res.data.is_unavailable);
      setReason(res.data.unavailable_reason || '');
      setAbsenceStart(res.data.absence_start ? res.data.absence_start.slice(0, 16) : '');
      setAbsenceEnd(res.data.absence_end ? res.data.absence_end.slice(0, 16) : '');
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchAbsenceStatus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAbsence(true);
    try {
      await axios.post('/api/hod/absence', {
        is_unavailable: isUnavailable,
        unavailable_reason: reason,
        absence_start: absenceStart || null,
        absence_end: absenceEnd || null
      }, { headers });

      showAlert('Success', 'HOD out-of-office status updated!');
      setShowAbsenceModal(false);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.detail || 'Failed to update availability status.');
    } finally { setSavingAbsence(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');
    try {
      await axios.post('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      }, { headers });
      setPwdMsg('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPwdErr(err.response?.data?.detail || 'Failed to update password.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuGroups = [
    {
      label: 'Pass Operations',
      items: [
        { id: 'pass_generator', label: 'Pass Generator (HOD)', icon: Key },
        { id: 'gatepass', label: 'Active Passes', icon: ShieldCheck },
        { id: 'lunch', label: 'Lunch Pass', icon: UtensilsCrossed },
        { id: 'latecomers', label: 'Late Comers', icon: Clock },
        { id: 'custom_pass', label: 'Custom Passes', icon: Sparkles },
      ]
    },
    {
      label: 'Academic & Section Mgmt',
      items: [
        { id: 'sections', label: 'Section Shuffle', icon: Building2 },
        { id: 'faculty_allotments', label: 'Faculty Allotments', icon: UserCheck },
        { id: 'directory', label: 'Student Directory', icon: Users },
      ]
    }
  ];

  return (
    <div className="portal-shell min-h-screen bg-[#f8fafc] dark:bg-[#0B0F19] flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Header Bar (Identical to Admin Dashboard) */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={20} className="text-emerald-600 dark:text-emerald-400" /> : <PanelLeftClose size={20} />}
            </button>

            <div className="flex items-center gap-2.5">
              <img src={logo} alt="GARUDA" className="h-8 w-auto object-contain" />
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Garuda</span>
              <span className="text-slate-300 dark:text-slate-700 font-light text-base select-none hidden sm:inline">|</span>
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-widest">
                HOD Portal ({collegeCode || 'KMEC'})
              </span>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            {/* Out of Office Quick Toggle */}
            <button
              onClick={() => setShowAbsenceModal(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
                isUnavailable
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/25 animate-pulse'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Calendar size={14} />
              {isUnavailable ? 'Out of Office (Active)' : 'Mark Out of Office'}
            </button>

            <ThemeToggle />
            <NotificationCenter />

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  {(fullName || username || 'H').charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{fullName || username}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider">HOD</p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{fullName || username}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Department Head</p>
                  </div>
                  <button
                    onClick={() => { setShowPasswordModal(true); setProfileDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock size={14} className="text-emerald-500" /> Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside
          className={`bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 flex flex-col z-30 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } hidden lg:flex`}
        >
          <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto custom-scrollbar">
            {menuGroups.map(group => (
              <div key={group.label} className="space-y-1">
                {!sidebarCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${expandedGroups[group.label] ? '' : '-rotate-90'}`}
                    />
                  </button>
                )}

                {(sidebarCollapsed || expandedGroups[group.label]) && (
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActivePage(item.id as HODSubPage)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Icon size={18} className="shrink-0" />
                          {!sidebarCollapsed && <span>{item.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activePage === 'pass_generator' && <PassGeneratorPage />}
          {activePage === 'gatepass' && <GatePassPage />}
          {activePage === 'lunch' && <LunchPassPage />}
          {activePage === 'latecomers' && <LateComersPage />}
          {activePage === 'custom_pass' && <CustomPassPage />}
          {activePage === 'sections' && <SectionsPage />}
          {activePage === 'faculty_allotments' && <FacultyAllotmentsPage />}
          {activePage === 'directory' && <StudentDirectoryPage />}
        </main>
      </div>

      {/* Out of Office Modal */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-amber-500" size={18} /> Out-of-Office Availability Setup
              </h3>
              <button onClick={() => setShowAbsenceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAbsence} className="space-y-4 text-xs font-semibold">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="isUnavailCheck"
                  checked={isUnavailable}
                  onChange={e => setIsUnavailable(e.target.checked)}
                  className="h-4 w-4 text-amber-600 rounded cursor-pointer"
                />
                <label htmlFor="isUnavailCheck" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                  Mark as Out-of-Office / Away
                </label>
              </div>

              {isUnavailable && (
                <>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Absence Reason *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Official Duty / Sick Leave"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Start Date/Time</label>
                      <input
                        type="datetime-local"
                        value={absenceStart}
                        onChange={e => setAbsenceStart(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">End Date/Time</label>
                      <input
                        type="datetime-local"
                        value={absenceEnd}
                        onChange={e => setAbsenceEnd(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
                When marked Out-of-Office, Section Mentors in your department are authorized to submit pass requests for your approval routing.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAbsence}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  {savingAbsence ? 'Saving...' : 'Save Availability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="text-emerald-500" size={18} /> Update Account Password
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {pwdMsg && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">{pwdMsg}</div>}
            {pwdErr && <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">{pwdErr}</div>}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
