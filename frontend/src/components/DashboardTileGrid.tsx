import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Key, ShieldCheck, UtensilsCrossed, Clock, Users, Sparkles, BookOpen, 
  UserPlus, GraduationCap, Building2, UserCheck, Shield, Search,
  LayoutDashboard
} from 'lucide-react';
import { useAuthStore } from '../store';

export default function DashboardTileGrid() {
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);
  const collegeId = useAuthStore(s => s.collegeId);
  const collegeName = useAuthStore(s => s.collegeName);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    active_passes: 0,
    late_entries: 0,
    lunch_passes: 0,
    pending_approvals: 0
  });

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const colParam = collegeId ? `?college_id=${collegeId}` : '';
    
    axios.get(`/api/gate/analytics${colParam}`, { headers })
      .then(res => {
        setStats({
          active_passes: res.data.active_passes || 0,
          late_entries: res.data.late_entries_today || 0,
          lunch_passes: res.data.lunch_passes_today || 0,
          pending_approvals: res.data.passes_today || 0
        });
      })
      .catch(() => {});
  }, [token, collegeId]);

  const allTiles = [
    {
      id: 'overview',
      title: 'Overview Analytics',
      icon: LayoutDashboard,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border dark:border-emerald-700/60 shadow-xs',
      roles: ['super_admin', 'admin']
    },
    {
      id: 'pass_generator',
      title: 'Pass Generator',
      icon: Key,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border dark:border-emerald-700/60 shadow-xs',
      roles: ['admin', 'hod']
    },
    {
      id: 'gatepass',
      title: 'Active Passes',
      icon: ShieldCheck,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 dark:border dark:border-blue-700/60 shadow-xs',
      roles: ['super_admin', 'admin', 'hod']
    },
    {
      id: 'lunch',
      title: 'Lunch Pass',
      icon: UtensilsCrossed,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400 dark:border dark:border-amber-700/60 shadow-xs',
      roles: ['super_admin', 'admin', 'hod']
    },
    {
      id: 'latecomers',
      title: 'Late Comers',
      icon: Clock,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 dark:border dark:border-purple-700/60 shadow-xs',
      roles: ['super_admin', 'admin', 'hod']
    },
    {
      id: 'sections',
      title: 'Section Shuffle',
      icon: Building2,
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 dark:border dark:border-indigo-700/60 shadow-xs',
      roles: ['super_admin', 'admin']
    },
    {
      id: 'faculty_allotments',
      title: 'Faculty Allotments',
      icon: UserCheck,
      iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/80 dark:text-teal-400 dark:border dark:border-teal-700/60 shadow-xs',
      roles: ['super_admin', 'admin']
    },
    {
      id: 'directory',
      title: 'Student Directory',
      icon: BookOpen,
      iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400 dark:border dark:border-sky-700/60 shadow-xs',
      roles: ['super_admin', 'admin', 'hod']
    },
    {
      id: 'onboarding',
      title: 'Onboard Students',
      icon: UserPlus,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400 dark:border dark:border-rose-700/60 shadow-xs',
      roles: ['super_admin', 'admin', 'hod']
    },
    {
      id: 'semester',
      title: 'Semester Mgmt',
      icon: GraduationCap,
      iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/80 dark:text-orange-400 dark:border dark:border-orange-700/60 shadow-xs',
      roles: ['super_admin', 'admin', 'hod']
    },
    {
      id: 'custom_pass',
      title: 'Custom Passes',
      icon: Sparkles,
      iconBg: 'bg-pink-50 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400 dark:border dark:border-pink-700/60 shadow-xs',
      roles: ['super_admin', 'admin', 'hod']
    },
    {
      id: 'departments',
      title: 'Departments Mgmt',
      icon: Building2,
      iconBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border dark:border-cyan-700/60 shadow-xs',
      roles: ['super_admin']
    },
    {
      id: 'users',
      title: 'Users Mgmt',
      icon: Shield,
      iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-700/60 shadow-xs',
      roles: ['super_admin']
    }
  ];

  const roleFiltered = allTiles.filter(t => t.roles.includes(role || 'admin'));
  const filteredTiles = roleFiltered.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Top Row: Premium Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-xl dark:hover:border-emerald-500/50 transition-all flex items-center gap-4 group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Active Passes Today</p>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{stats.active_passes}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-xl dark:hover:border-purple-500/50 transition-all flex items-center gap-4 group">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Late Entries Today</p>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{stats.late_entries}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-xl dark:hover:border-amber-500/50 transition-all flex items-center gap-4 group">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={28} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Lunch Passes Issued</p>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{stats.lunch_passes}</h4>
          </div>
        </div>
      </div>

      {/* Title & Instant Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
          Module Quick Actions
        </h3>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input 
            type="text"
            placeholder="Search action tile..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all font-semibold shadow-xs"
          />
        </div>
      </div>

      {/* Grid of Clean Minimal App Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredTiles.map(tile => {
          const Icon = tile.icon;
          return (
            <div 
              key={tile.id}
              onClick={() => navigate(`/admin/${tile.id}`)}
              className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer shadow-xs hover:shadow-2xl hover:-translate-y-1.5 hover:border-emerald-500/60 dark:hover:border-emerald-400/80 transition-all duration-200 min-h-[145px]"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 transition-transform group-hover:scale-110 duration-200 ${tile.iconBg}`}>
                <Icon size={26} />
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug tracking-tight">
                {tile.title}
              </h4>
            </div>
          );
        })}
      </div>
    </div>
  );
}
