import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, LayoutDashboard, ShieldCheck, UtensilsCrossed, Clock, GraduationCap, Menu, X,
  UserCheck, Users, UserPlus, Key, BookOpen, ChevronDown, Lock, Sparkles,
  Building2, ArrowLeft, Shield, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import logo from '../assets/logo.png';
import ngitLogo from '../assets/ngit.png';
import kmecLogo from '../assets/kmec.png';
import ThemeToggle from '../components/ThemeToggle';

import DashboardTileGrid from '../components/DashboardTileGrid';
import OverviewPage from './admin/OverviewPage';
import PassGeneratorPage from './admin/PassGeneratorPage';
import GatePassPage from './admin/GatePassPage';
import LunchPassPage from './admin/LunchPassPage';
import LateComersPage from './admin/LateComersPage';
import SemesterPage from './admin/SemesterPage';
import BulkManagementPage from './admin/BulkManagementPage';
import CustomPassPage from './admin/CustomPassPage';
import StudentOnboardingPage from './admin/StudentOnboardingPage';
import StudentDirectoryPage from './admin/StudentDirectoryPage';
import StudentHistoryView from './shared/StudentHistoryView';
import DepartmentsPage from './admin/DepartmentsPage';
import UsersPage from './admin/UsersPage';
import SectionsPage from './admin/SectionsPage';
import FacultyAllotmentsPage from './admin/FacultyAllotmentsPage';

import NotificationCenter from '../components/NotificationCenter';
import CustomSelect from '../components/CustomSelect';
import ForbiddenPage from './ForbiddenPage';

type Page = 'dashboard' | 'pass_generator' | 'overview' | 'gatepass' | 'lunch' | 'latecomers' | 'semester' | 'bulk' | 'custom_pass' | 'onboarding' | 'directory' | 'departments' | 'users' | 'sections' | 'faculty_allotments' | 'student_history';

export default function AdminDashboard() {
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const username = useAuthStore(s => s.username);
  const collegeId = useAuthStore(s => s.collegeId);
  const collegeName = useAuthStore(s => s.collegeName);
  const collegeCode = useAuthStore(s => s.collegeCode);
  const fullName = useAuthStore(s => s.fullName);
  const logout = useAuthStore(s => s.logout);
  const setCollegeContext = useAuthStore(s => s.setCollegeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('garuda_sidebar_collapsed') === 'true';
  });

  // Expandable group state in sidebar
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Pass Operations': true,
    'Academic & Faculty': true,
    'System Admin': true,
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [colleges, setColleges] = useState<any[]>([]);

  const profileRef = useRef<HTMLDivElement | null>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('garuda_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const pageMap: Record<string, React.ComponentType<any>> = {
    dashboard: OverviewPage,
    pass_generator: PassGeneratorPage,
    overview: OverviewPage,
    users: UsersPage,
    departments: DepartmentsPage,
    sections: SectionsPage,
    faculty_allotments: FacultyAllotmentsPage,
    gatepass: GatePassPage,
    lunch: LunchPassPage,
    latecomers: LateComersPage,
    semester: SemesterPage,
    bulk: BulkManagementPage,
    custom_pass: CustomPassPage,
    onboarding: StudentOnboardingPage,
    directory: StudentDirectoryPage,
    student_history: StudentHistoryView,
  };

  const pageRolePermissions: Record<string, string[]> = {
    dashboard: ['super_admin', 'admin', 'hod'],
    overview: ['super_admin', 'admin', 'hod'],
    pass_generator: ['admin', 'hod'],
    gatepass: ['super_admin', 'admin', 'hod'],
    lunch: ['super_admin', 'admin', 'hod'],
    latecomers: ['super_admin', 'admin', 'hod'],
    student_history: ['super_admin', 'admin', 'hod'],
    sections: ['super_admin', 'admin'],
    faculty_allotments: ['super_admin', 'admin'],
    directory: ['super_admin', 'admin', 'hod'],
    onboarding: ['super_admin', 'admin', 'hod'],
    semester: ['super_admin', 'admin', 'hod'],
    custom_pass: ['super_admin', 'admin', 'hod'],
    departments: ['super_admin'],
    users: ['super_admin'],
  };

  const rawSubpath = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const activePage: Page = (rawSubpath && pageMap[rawSubpath]) ? (rawSubpath as Page) : 'dashboard';

  const isDashboardRoute = !rawSubpath || rawSubpath === 'dashboard';
  const isKnownRoute = Boolean(pageMap[rawSubpath]);
  const isAuthorized = isDashboardRoute || (
    isKnownRoute && pageRolePermissions[rawSubpath] && pageRolePermissions[rawSubpath].includes(role || '')
  );

  const renderPageContent = () => {
    if (isDashboardRoute) return <OverviewPage />;
    if (!isKnownRoute) return <ForbiddenPage type="404" path={`/admin/${rawSubpath}`} />;
    if (!isAuthorized) return <ForbiddenPage type="403" path={`/admin/${rawSubpath}`} />;
    const Comp = pageMap[rawSubpath] || OverviewPage;
    return <Comp />;
  };

  useEffect(() => {
    if (role === 'super_admin') {
      axios.get('/api/admin/colleges', { headers })
        .then(r => {
          setColleges(r.data);
          if (r.data.length > 0 && !collegeId) {
            setCollegeContext(r.data[0].id, r.data[0].name, r.data[0].code);
          }
        })
        .catch(() => { });
    }
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Menu Groups for Categorized Navigation (Clean & Scoped)
  const menuGroups = [
    {
      label: 'Pass Operations',
      roles: ['super_admin', 'admin', 'hod'],
      items: [
        { id: 'pass_generator', label: 'Pass Generator', icon: Key, roles: ['admin', 'hod'] },
        { id: 'gatepass', label: 'Active Passes', icon: ShieldCheck, roles: ['super_admin', 'admin', 'hod'] },
        { id: 'lunch', label: 'Lunch Pass', icon: UtensilsCrossed, roles: ['super_admin', 'admin', 'hod'] },
        { id: 'latecomers', label: 'Late Comers', icon: Clock, roles: ['super_admin', 'admin', 'hod'] },
        { id: 'custom_pass', label: 'Custom Passes', icon: Sparkles, roles: ['admin', 'hod'] },
      ]
    },
    {
      label: 'Academic & Faculty',
      roles: ['super_admin', 'admin', 'hod'],
      items: [
        { id: 'sections', label: 'Section Shuffle', icon: Building2, roles: ['super_admin', 'admin'] },
        { id: 'faculty_allotments', label: 'Faculty Allotments', icon: UserCheck, roles: ['super_admin', 'admin'] },
        { id: 'directory', label: 'Student Directory', icon: BookOpen, roles: ['super_admin', 'admin', 'hod'] },
        { id: 'onboarding', label: 'Onboard Students', icon: UserPlus, roles: ['super_admin', 'admin', 'hod'] },
        { id: 'semester', label: 'Semester Mgmt', icon: GraduationCap, roles: ['super_admin', 'admin', 'hod'] },
      ]
    },
    {
      label: 'System Admin',
      roles: ['super_admin', 'admin'],
      items: [
        { id: 'departments', label: 'Departments Mgmt', icon: Building2, roles: ['super_admin'] },
        { id: 'users', label: 'Users Management', icon: Users, roles: ['super_admin'] },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0B0F19] flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left Brand & Institutional Badges */}
          <div className="flex items-center gap-3">
            {/* Single Sidebar Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={20} className="text-emerald-600 dark:text-emerald-400" /> : <PanelLeftClose size={20} />}
            </button>

            {/* Logo & Institutional Brand Cluster */}
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex items-center gap-2">
                <img src={logo} alt="GARUDA" className="h-8 w-auto object-contain group-hover:scale-105 transition-transform" />
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Garuda</span>
              </div>

              {/* Divider | */}
              <span className="text-slate-300 dark:text-slate-700 font-light text-base select-none hidden sm:inline">|</span>

              {/* Institutional Badges Cluster */}
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="p-0.5 px-2 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center h-6.5" title="Neil Gogte Institute of Technology">
                  <img src={ngitLogo} alt="NGIT" className="h-4 w-auto object-contain" />
                </div>

                <span className="text-slate-300 dark:text-slate-700 font-light text-xs select-none">|</span>

                <div className="p-0.5 px-2 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center h-6.5" title="Keshav Memorial Engineering College">
                  <img src={kmecLogo} alt="KMEC" className="h-4 w-auto object-contain" />
                </div>
              </div>
            </Link>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {role === 'super_admin' && colleges.length > 0 && (
              <div className="w-44 sm:w-56 hidden sm:block">
                <CustomSelect
                  value={collegeId ? String(collegeId) : ''}
                  onChange={(val) => {
                    if (!val) {
                      setCollegeContext(null, 'Global System', 'GLOBAL');
                    } else {
                      const c = colleges.find((col: any) => col.id === Number(val));
                      if (c) setCollegeContext(c.id, c.name, c.code);
                    }
                  }}
                  options={[
                    { value: '', label: 'Global View (All Colleges)' },
                    ...colleges.map((c: any) => ({
                      value: String(c.id),
                      label: `${c.name} (${c.code})`
                    }))
                  ]}
                  placeholder="Global View (All Colleges)"
                />
              </div>
            )}

            <ThemeToggle />
            <NotificationCenter />

            {/* User Profile & Logout Popover */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-emerald-500 transition-all shadow-xs cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                  {(fullName || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
                  {username || fullName || 'User'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Popover Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{fullName || 'Staff Account'}</p>
                    <p className="text-[10px] font-mono text-slate-400">@{username || 'user'}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {role === 'super_admin' ? 'Super Admin' : (role === 'hod' ? 'HOD' : 'Admin')}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {collegeCode || 'KMEC'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      onClick={() => { setProfileDropdownOpen(false); setShowPasswordModal(true); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-emerald-500" /> Change Password
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            <button
              onClick={() => { navigate('/admin/dashboard'); setMobileMenuOpen(false); }}
              className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2 ${activePage === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100'}`}
            >
              <LayoutDashboard size={16} /> Overview Analytics
            </button>

            {menuGroups.map(group => {
              const visibleItems = group.items.filter(i => i.roles.includes(role || 'admin'));
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.label} className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3">{group.label}</p>
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { navigate(`/admin/${item.id}`); setMobileMenuOpen(false); }}
                        className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 ${activePage === item.id ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        <Icon className="w-4 h-4 text-emerald-500" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full text-left py-2 px-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Layout Area: Vertical Sidebar + Main Surface */}
      <div className="flex-1 flex w-full">
        {/* Desktop Collapsible Vertical Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 sticky top-16 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* Sidebar Items (Scrollbar Hidden cleanly) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

            {/* Overview Main Landing Route */}
            <div className="relative group">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activePage === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-emerald-600'
                } ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}
              >
                <LayoutDashboard className={`w-5 h-5 shrink-0 ${activePage === 'dashboard' ? 'text-white' : 'text-emerald-500'}`} />
                {!sidebarCollapsed && (
                  <span className="truncate">Overview</span>
                )}
              </button>

              {/* Hover Tooltip when Collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 transform translate-x-1 group-hover:translate-x-0">
                  Overview Analytics
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />

            {/* Menu Groups */}
            {menuGroups.filter(g => g.roles.includes(role || 'admin')).map(group => {
              const visibleItems = group.items.filter(i => i.roles.includes(role || 'admin'));
              if (visibleItems.length === 0) return null;

              const isExpanded = expandedGroups[group.label] !== false;

              return (
                <div key={group.label} className="space-y-1">
                  {/* Group Header */}
                  {!sidebarCollapsed ? (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                    </button>
                  ) : (
                    <div className="h-0.5 bg-slate-100 dark:bg-slate-800/80 my-1.5" />
                  )}

                  {/* Group Items */}
                  {(isExpanded || sidebarCollapsed) && (
                    <div className="space-y-1">
                      {visibleItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id;

                        return (
                          <div key={item.id} className="relative group">
                            <button
                              onClick={() => navigate(`/admin/${item.id}`)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-200 dark:border-emerald-800'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-emerald-600'
                              } ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                            >
                              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-500 transition-colors'}`} />
                              {!sidebarCollapsed && (
                                <span className="truncate">{item.label}</span>
                              )}
                            </button>

                            {/* Hover Tooltip when Collapsed */}
                            {sidebarCollapsed && (
                              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 transform translate-x-1 group-hover:translate-x-0">
                                {item.label}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Surface Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Dynamic Page View Component */}
          {renderPageContent()}
        </main>
      </div>

      {/* Account Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock size={18} className="text-emerald-500" /> Change Account Password
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            {pwdMsg && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">{pwdMsg}</div>}
            {pwdErr && <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">{pwdErr}</div>}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Old Password</label>
                <input
                  type="password" required
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">New Password</label>
                <input
                  type="password" required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all uppercase cursor-pointer">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
