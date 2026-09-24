import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import {
  ShieldCheck,
  Key,
  Clock,
  UtensilsCrossed,
  Users,
  Building2,
  BookOpen,
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Sun,
  Moon,
  Layers,
  MapPin,
  Mail,
  Phone,
  Award,
  GraduationCap,
  Linkedin
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);

  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const getPortalPath = () => {
    if (!token) return '/login';
    if (role === 'security') return '/security';
    if (role === 'hod') return '/hod';
    if (role === 'mentor') return '/mentor';
    return '/admin';
  };

  const handlePortalClick = () => {
    navigate(getPortalPath());
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">

      {/* ── 1. STICKY NAVBAR ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#E8752D] to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
              <ShieldCheck size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">GARUDA</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#E8752D] text-white shadow-xs">
                  KMEC • NGIT • KMIT
                </span>
              </div>
              <p className="text-[10px] font-bold tracking-widest text-[#004F50] dark:text-teal-400 uppercase">Smart Campus Platform</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-extrabold text-slate-700 dark:text-slate-200">
            <button onClick={() => scrollToSection('hero')} className="hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-colors cursor-pointer">Home</button>
            <button onClick={() => scrollToSection('about')} className="hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-colors cursor-pointer">About</button>
            <button onClick={() => scrollToSection('features')} className="hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection('institutions')} className="hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-colors cursor-pointer">Institutions</button>
            <button onClick={() => scrollToSection('leadership')} className="hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-colors cursor-pointer">Leadership</button>
            <button onClick={() => scrollToSection('mentors')} className="hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-colors cursor-pointer">Mentors</button>
            <button onClick={() => scrollToSection('team')} className="hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-colors cursor-pointer">Team</button>
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#E8752D] dark:hover:text-[#FB923C] transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={handlePortalClick}
              className="px-5 py-2.5 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-lg shadow-orange-600/25 transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>{token ? 'Go to Dashboard' : 'Access Portal'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ─────────────────────────────────────────────────── */}
      <section id="hero" className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-[#004F50]/10 via-transparent to-transparent">
        {/* Background Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#004F50]/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-[#E8752D]/10 dark:bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Content (7 cols) */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-[#004F50] dark:text-teal-300 text-xs font-extrabold uppercase tracking-wider animate-bounce">
                <Sparkles size={14} className="text-[#E8752D]" />
                <span>Next-Gen Smart Campus Pass System</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Smart Campus Management, <span className="bg-gradient-to-r from-[#004F50] via-teal-600 to-[#E8752D] bg-clip-text text-transparent">Simplified.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl font-medium leading-relaxed mx-auto lg:mx-0">
                Garuda is a unified platform designed to simplify campus pass management, student movement, faculty coordination, and administrative operations across KMIT, KMEC, and NGIT.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => scrollToSection('features')}
                  className="w-full sm:w-auto px-8 py-4 bg-[#004F50] hover:bg-[#003B3C] text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-xl shadow-teal-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles size={18} className="text-[#E8752D]" />
                  <span>Explore Features</span>
                </button>

                <button
                  onClick={handlePortalClick}
                  className="w-full sm:w-auto px-8 py-4 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-xl shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>{token ? 'Go to Dashboard' : 'Access Portal / Login'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Key Trust Highlights */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <h4 className="text-2xl font-black text-[#004F50] dark:text-white">100%</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Digital Pass Tracking</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-[#E8752D]">Live</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Security Gate Sync</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-[#004F50] dark:text-white">Multi-College</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Role Scoping</p>
                </div>
              </div>
            </div>

            {/* Right Graphic Mockup Widget (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#004F50]/10 rounded-full blur-2xl pointer-events-none" />

                {/* Mock Card Header with Institutional Teal Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Garuda Live Gate Verification</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-[#E8752D] text-white rounded-full shadow-xs">
                    GATE VERIFIED
                  </span>
                </div>

                {/* Mock Student Card */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <div className="w-14 h-14 rounded-2xl bg-[#004F50] text-white font-black flex items-center justify-center text-xl shrink-0">
                      SK
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-black text-slate-900 dark:text-white truncate">STUDENT 1</h4>
                      <p className="text-xs font-mono text-slate-500">245***7**2**• III CSE A</p>
                      <span className="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 bg-teal-50 dark:bg-teal-950 text-[#004F50] dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800">
                        Pass: Half Day Outpass
                      </span>
                    </div>
                  </div>

                  {/* Pass Details Pill */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Exit Window</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">12:30 PM – 05:00 PM</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Pass Usage</span>
                      <span className="font-extrabold text-[#E8752D]">2 / 5 Semester Passes</span>
                    </div>
                  </div>

                  {/* Scan Status Badge */}
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <span>Security Gate Scan Authorized</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">12:34 PM IST</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. ABOUT GARUDA SECTION ─────────────────────────────────────────── */}
      <section id="about" className="py-20 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#004F50] dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              About Garuda Platform
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Digitizing Campus Movement & Institutional Operations
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Garuda is an in-house college-developed smart campus platform built to eliminate paper-based outpasses, streamline gate security verification, coordinate departmental faculty assignments, and provide executive administrative analytics in real time across KMIT, KMEC, and NGIT.
            </p>
          </div>

          {/* 5 Core Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3 hover:border-[#004F50] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#004F50] text-white mx-auto flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Centralized Scoping</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Multi-college support across KMIT, KMEC, and NGIT with strict role scoping.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3 hover:border-[#E8752D] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#E8752D] text-white mx-auto flex items-center justify-center">
                <Key size={24} />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Smart Pass Systems</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant digital passes, custom event passes, and scheduled lunch pass windows.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3 hover:border-[#004F50] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#003B3C] text-white mx-auto flex items-center justify-center">
                <Clock size={24} />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Real-Time Tracking</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant security gate sync, exit/return timestamping, and late entry strikes.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3 hover:border-[#E8752D] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#E8752D] text-white mx-auto flex items-center justify-center">
                <Users size={24} />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Faculty Coordination</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">HOD authority scoping with automated mentor fallback during HOD absence.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3 hover:border-[#004F50] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#004F50] text-white mx-auto flex items-center justify-center">
                <BarChart3 size={24} />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Executive Insights</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live campus outpass metrics, missing lunch student alerts, and CSV reporting.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. FEATURES SECTION ─────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#004F50] dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Core Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Comprehensive Tools for Campus Administration
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Designed from the ground up to solve real-world campus movement challenges across security, faculty, and administrative departments.
            </p>
          </div>

          {/* 9 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#E8752D] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#004F50] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Key size={26} className="text-[#E8752D]" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Smart Pass Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Issue single student passes or bulk section outpasses instantly. Enforces strict semester pass limits (e.g. 5 passes) with emergency override support.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#004F50] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#E8752D] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck size={26} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Pass Tracking</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Real-time security gate verification scanner sync. Monitors active unclosed outpasses, gate exits, and student returns automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#E8752D] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#003B3C] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <UtensilsCrossed size={26} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Lunch Pass System</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Configure automated lunch exit/re-entry windows (e.g. 12:30–1:15 PM) with duplicate scan prevention and live missing-student alerts.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#004F50] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#E8752D] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock size={26} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Late Entry Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Scan late arrivals at security gates. Tracks cumulative late entry strikes per student with semester limit warnings and notifications.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#E8752D] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#004F50] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={26} className="text-[#E8752D]" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Faculty Allotments</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Map department faculty and mentors to specific sections (e.g. III CSE A). HODs manage and audit allotments within their department scope.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#004F50] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#E8752D] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers size={26} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Section Shuffle</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Batch promote or transfer student groups across semesters and sections (e.g. CSE Elite A1 $\rightarrow$ III CSE Elite A1) seamlessly.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#E8752D] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#004F50] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen size={26} className="text-[#E8752D]" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Student Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Full-featured student search with multi-field filters, unlimited paginated record viewing, and direct profile editing.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#004F50] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#E8752D] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 size={26} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Department Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Specialized scoping logic: H&S HOD manages all 1st-Year sections (`I CSE A`), while Department HODs manage Years II, III, and IV.
              </p>
            </div>

            {/* Feature 9 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[#E8752D] transition-all space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#004F50] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 size={26} className="text-[#E8752D]" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Analytics & Insights</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Live executive dashboards tracking daily pass totals, security gate exit metrics, lunch statistics, and downloadable CSV audits.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. HOW IT WORKS WORKFLOW ─────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#004F50] dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              System Workflow
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">How Garuda Operates</h2>
            <p className="text-slate-500 text-xs font-semibold">End-to-end digital lifecycle from request to verification and analytics</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3">
              <span className="w-8 h-8 rounded-full bg-[#004F50] text-white font-black text-xs flex items-center justify-center mx-auto">1</span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Student / Faculty</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Pass request raised by mentor or issued directly by HOD/Admin.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3">
              <span className="w-8 h-8 rounded-full bg-[#E8752D] text-white font-black text-xs flex items-center justify-center mx-auto">2</span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Pass Generator</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">System checks semester limits (5/5) & generates digital QR token.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3">
              <span className="w-8 h-8 rounded-full bg-[#004F50] text-white font-black text-xs flex items-center justify-center mx-auto">3</span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Gate Verification</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Security scans pass at main gate; validates time & student photo.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3">
              <span className="w-8 h-8 rounded-full bg-[#E8752D] text-white font-black text-xs flex items-center justify-center mx-auto">4</span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Real-Time Tracking</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Live dashboard updates active outpass counts & exit status.</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-3">
              <span className="w-8 h-8 rounded-full bg-[#004F50] text-white font-black text-xs flex items-center justify-center mx-auto">5</span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Analytics Audit</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Executive metrics, late entry tracking, & downloadable reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. INSTITUTIONS SECTION ("Built for Our Campuses") ─────────────── */}
      <section id="institutions" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#004F50] dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Campus Deployment
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Built for Our Campuses
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Garuda has been developed and integrated specifically for Keshav Memorial Educational Society institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* KMIT Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-[#004F50] dark:border-teal-600/40 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950 text-[#004F50] dark:text-teal-300 rounded-full text-[10px] font-black uppercase border border-teal-200 dark:border-teal-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Currently Deployed & Operational
                  </span>
                  <span className="text-xs font-mono font-black text-slate-400">CODE: KMIT</span>
                </div>
                <h3 className="text-2xl font-black text-[#004F50] dark:text-white">KMIT</h3>
                <p className="text-xs font-bold text-[#E8752D]">Keshav Memorial Institute of Technology</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Garuda is active live at KMIT campus for daily outpasses, lunch passes, security gate scanning, and student movement monitoring.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-slate-400">
                <span>Location: Narayanguda, Hyd</span>
                <span className="text-[#004F50] dark:text-teal-400 font-bold">Active Live</span>
              </div>
            </div>

            {/* KMEC Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-orange-50 dark:bg-orange-950 text-[#E8752D] rounded-full text-[10px] font-black uppercase border border-orange-200 dark:border-orange-900">
                    Designed for Campus Expansion
                  </span>
                  <span className="text-xs font-mono font-black text-slate-400">CODE: KMEC</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">KMEC</h3>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Keshav Memorial Engineering College</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Full institutional architecture ready for multi-college role scoping, department allotments, and gate pass management.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-slate-400">
                <span>Location: Hyderabad</span>
                <span className="text-[#E8752D] font-bold">Ready for Deployment</span>
              </div>
            </div>

            {/* NGIT Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-[#004F50] dark:border-teal-600/40 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950 text-[#004F50] dark:text-teal-300 rounded-full text-[10px] font-black uppercase border border-teal-200 dark:border-teal-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Currently Deployed & Operational
                  </span>
                  <span className="text-xs font-mono font-black text-slate-400">CODE: NGIT</span>
                </div>
                <h3 className="text-2xl font-black text-[#004F50] dark:text-white">NGIT</h3>
                <p className="text-xs font-bold text-[#E8752D]">Neil Gogte Institute of Technology</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Deployed and actively powering digital gate passes, student directory lookups, latecomer logs, and HOD approvals.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-slate-400">
                <span>Location: Uppal, Hyderabad</span>
                <span className="text-[#004F50] dark:text-teal-400 font-bold">Active Live</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 7. MANAGEMENT & INSTITUTIONAL LEADERSHIP ───────────────────────── */}
      <section id="leadership" className="py-24 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#004F50] dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Visionary Support
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Institutional Leadership & Support
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              We express our deepest gratitude to the leadership of Keshav Memorial Educational Society for inspiring innovation, encouraging student-led technological advancements, and supporting the development of Garuda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Neil Gogte */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xl space-y-6 text-center group hover:border-[#004F50] transition-all">
              <div className="w-36 h-36 rounded-3xl mx-auto overflow-hidden border-4 border-[#004F50] dark:border-teal-600 shadow-xl bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src="/images/leadership/neil_gogte.jpg"
                  alt="Neil Gogte"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/leadership/neil_gogte.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Mr. Neil Gogte</h3>
                <p className="text-xs font-black uppercase tracking-wider text-[#E8752D]">Founder</p>
                <div className="pt-2 flex flex-wrap justify-center gap-1.5 text-[10px] font-mono font-bold text-slate-500">
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMIT</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">NGIT</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMEC</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMCE</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Pioneer in technology education who continually empowers students and faculty to build cutting-edge campus systems.
              </p>
            </div>

            {/* Nithin Sahasrabudhe */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xl space-y-6 text-center group hover:border-[#004F50] transition-all">
              <div className="w-36 h-36 rounded-3xl mx-auto overflow-hidden border-4 border-[#004F50] dark:border-teal-600 shadow-xl bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src="/images/leadership/nithin_sahasrabudhe.jpg"
                  alt="Nithin Sahasrabudhe"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/leadership/nithin_sahasrabudhe.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Mr. Nitin Sahasrabudhe</h3>
                <p className="text-xs font-black uppercase tracking-wider text-[#E8752D]">Founder Director</p>
                <div className="pt-2 flex flex-wrap justify-center gap-1.5 text-[10px] font-mono font-bold text-slate-500">
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMIT</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMEC</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">NGIT</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMCE</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Strategic leader guiding institutional operational excellence and digital transformation initiatives across campuses.
              </p>
            </div>

            {/* Deepa Ganu */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xl space-y-6 text-center group hover:border-[#004F50] transition-all">
              <div className="w-36 h-36 rounded-3xl mx-auto overflow-hidden border-4 border-[#004F50] dark:border-teal-600 shadow-xl bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src="/images/leadership/deepa_ganu.jpg"
                  alt="Deepa Ganu"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/leadership/deepa_ganu.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Ms. Deepa Ganu</h3>
                <p className="text-xs font-black uppercase tracking-wider text-[#E8752D]">Director Academic</p>
                <div className="pt-2 flex flex-wrap justify-center gap-1.5 text-[10px] font-mono font-bold text-slate-500">
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMIT</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMEC</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">NGIT</span>
                  <span className="px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">KMCE</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Academic visionary driving rigorous standards, student discipline systems, and technical project excellence.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 8. PROJECT MENTORS & ACADEMIC GUIDANCE ──────────────────────────── */}
      <section id="mentors" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#004F50] dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Academic Mentorship
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Project Mentors & Academic Guidance
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              We extend our gratitude to our esteemed faculty mentors for their constant technical direction, feedback, and academic guidance throughout the architecture and building of Garuda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Para Upendar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 text-center group hover:border-[#E8752D] transition-all">
              <div className="w-32 h-32 rounded-3xl mx-auto overflow-hidden border-2 border-[#004F50] shadow-lg bg-slate-100 dark:bg-slate-800 relative">
                <img
                  src="/images/mentors/para_upendar.jpg"
                  alt="Para Upendar"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/mentors/para_upendar.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Mr. Para Upendar</h3>
                <p className="text-xs font-extrabold text-[#E8752D]">Incharge HOD — IV Year</p>
                <p className="text-[11px] font-bold text-slate-400">Department of CSE, KMIT</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Provided overarching department vision, domain requirements oversight, and administrative alignment.
              </p>
            </div>

            {/* ALK Bilhari */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 text-center group hover:border-[#E8752D] transition-all">
              <div className="w-32 h-32 rounded-3xl mx-auto overflow-hidden border-2 border-[#004F50] shadow-lg bg-slate-100 dark:bg-slate-800 relative">
                <img
                  src="/images/mentors/alk_bilhari.jpg"
                  alt="ALK Bilhari"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/mentors/alk_bilhari.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">ALK Bilhari</h3>
                <p className="text-xs font-extrabold text-[#E8752D]">Assistant Professor</p>
                <p className="text-[11px] font-bold text-slate-400">Department of CSE, KMIT</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Technical mentor guiding platform architecture, database schemas, and system security practices.
              </p>
            </div>

            {/* Vanitha */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 text-center group hover:border-[#E8752D] transition-all">
              <div className="w-32 h-32 rounded-3xl mx-auto overflow-hidden border-2 border-[#004F50] shadow-lg bg-slate-100 dark:bg-slate-800 relative">
                <img
                  src="/images/mentors/vanitha.jpg"
                  alt="Vanitha"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/mentors/vanitha.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Vanitha</h3>
                <p className="text-xs font-extrabold text-[#E8752D]">Assistant Professor</p>
                <p className="text-[11px] font-bold text-slate-400">KMEC & NGIT</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Academic mentor supervising multi-campus coordination, faculty workflow integration, and usability.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 9. MEET THE TEAM SECTION ("The Team Behind Garuda") ────────────── */}
      <section id="team" className="py-24 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#004F50] dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Engineering Team
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              The Team Behind Garuda
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Designed, engineered, and delivered by passionate student developers. Connect with us!
            </p>
          </div>

          {/* Featured Team Lead Card */}
          <div className="max-w-xl mx-auto bg-gradient-to-br from-[#004F50] to-[#003B3C] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group border border-teal-700/60">
            <div className="absolute right-0 top-0 w-40 h-40 bg-[#E8752D]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative z-10">
              <div className="w-36 h-36 rounded-2xl overflow-hidden border-4 border-[#E8752D] shadow-xl bg-slate-800 shrink-0 relative">
                <img
                  src="/images/team/sai_kishor.jpg"
                  alt="Sai Kishor"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/team/sai_kishor.svg";
                  }}
                />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-[#E8752D] text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                  TEAM LEAD & ARCHITECT
                </span>
                <h3 className="text-2xl font-black">Sai Kishor</h3>
                <p className="text-xs text-teal-100 font-medium leading-relaxed">
                  Led platform architecture, database engineering, role-scoping algorithms, and full-stack integration for Garuda.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                  <a
                    href="mailto:sai.kishor@kmit.in"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-800/80 hover:bg-[#E8752D] text-white text-xs font-bold transition-all shadow-xs"
                    title="Email Sai Kishor"
                  >
                    <Mail size={14} />
                    <span>sai.kishor@kmit.in</span>
                  </a>
                  <a
                    href="https://linkedin.com/in/sai-kishor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-800/80 hover:bg-[#0A66C2] text-white text-xs font-bold transition-all shadow-xs"
                    title="LinkedIn Profile"
                  >
                    <Linkedin size={14} />
                    <span>LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            {/* Pranay Teja */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-lg text-center space-y-4 group hover:border-[#E8752D] transition-all">
              <div className="w-28 h-28 rounded-2xl mx-auto overflow-hidden border-2 border-[#004F50] bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src="/images/team/pranay_teja.jpg"
                  alt="Pranay Teja"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/team/pranay_teja.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">Pranay Teja</h4>
                <p className="text-xs font-bold text-[#E8752D]">Team Member</p>
                <p className="text-[11px] text-slate-400">Core Developer</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href="mailto:pranay.teja@kmit.in"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#E8752D] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="Email Pranay Teja"
                >
                  <Mail size={15} />
                </a>
                <a
                  href="https://linkedin.com/in/pranay-teja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#0A66C2] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="LinkedIn Profile"
                >
                  <Linkedin size={15} />
                </a>
              </div>
            </div>

            {/* Bharath Mahesh Reddy */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-lg text-center space-y-4 group hover:border-[#E8752D] transition-all">
              <div className="w-28 h-28 rounded-2xl mx-auto overflow-hidden border-2 border-[#004F50] bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src="/images/team/bharath_mahesh_reddy.jpg"
                  alt="Bharath Mahesh Reddy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/team/bharath_mahesh_reddy.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">Bharath Mahesh Reddy</h4>
                <p className="text-xs font-bold text-[#E8752D]">Team Member</p>
                <p className="text-[11px] text-slate-400">Core Developer</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href="mailto:bharath.mahesh@kmit.in"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#E8752D] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="Email Bharath Mahesh Reddy"
                >
                  <Mail size={15} />
                </a>
                <a
                  href="https://linkedin.com/in/bharath-mahesh-reddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#0A66C2] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="LinkedIn Profile"
                >
                  <Linkedin size={15} />
                </a>
              </div>
            </div>

            {/* Sanhith Reddy */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-lg text-center space-y-4 group hover:border-[#E8752D] transition-all">
              <div className="w-28 h-28 rounded-2xl mx-auto overflow-hidden border-2 border-[#004F50] bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src="/images/team/sanhith_reddy.jpg"
                  alt="Sanhith Reddy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/team/sanhith_reddy.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">Sanhith Reddy</h4>
                <p className="text-xs font-bold text-[#E8752D]">Team Member</p>
                <p className="text-[11px] text-slate-400">Core Developer</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href="mailto:sanhith.reddy@kmit.in"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#E8752D] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="Email Sanhith Reddy"
                >
                  <Mail size={15} />
                </a>
                <a
                  href="https://linkedin.com/in/sanhith-reddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#0A66C2] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="LinkedIn Profile"
                >
                  <Linkedin size={15} />
                </a>
              </div>
            </div>

            {/* Chandana */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-lg text-center space-y-4 group hover:border-[#E8752D] transition-all">
              <div className="w-28 h-28 rounded-2xl mx-auto overflow-hidden border-2 border-[#004F50] bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src="/images/team/chandana.jpg"
                  alt="Chandana"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    e.currentTarget.src = "/images/team/chandana.svg";
                  }}
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">Chandana</h4>
                <p className="text-xs font-bold text-[#E8752D]">Team Member</p>
                <p className="text-[11px] text-slate-400">Core Developer</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href="mailto:chandana@kmit.in"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#E8752D] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="Email Chandana"
                >
                  <Mail size={15} />
                </a>
                <a
                  href="https://linkedin.com/in/chandana"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-[#0A66C2] hover:text-white transition-all shadow-xs border border-slate-200 dark:border-slate-600"
                  title="LinkedIn Profile"
                >
                  <Linkedin size={15} />
                </a>
              </div>
            </div>

          </div>

          {/* 📸 Dedicated Full-Team Photo Section */}
          <div className="mt-12 bg-gradient-to-tr from-[#003B3C] to-[#004F50] text-white rounded-3xl p-8 lg:p-12 border border-teal-700/60 shadow-2xl relative overflow-hidden">
            <div className="max-w-3xl space-y-4 mb-8">
              <span className="text-xs font-black uppercase tracking-widest text-white bg-[#E8752D] px-3 py-1 rounded-full shadow-xs">
                Official Project Group
              </span>
              <h3 className="text-3xl font-black tracking-tight">Together, Building Garuda</h3>
              <p className="text-xs text-teal-100 font-medium">
                The combined engineering team behind the design, development, and campus implementation of the Garuda Smart Campus Platform.
              </p>
            </div>

            {/* Full Team Image Frame Placeholder Container */}
            <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-900 border-2 border-[#E8752D] relative group flex items-center justify-center">
              <img
                src="/images/team/garuda_team_photo.jpg"
                alt="Garuda Full Team Photo"
                className="w-full h-full object-cover"
                onError={e => {
                  e.currentTarget.src = "/images/team/garuda_team_photo.svg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <p className="text-xs font-black uppercase tracking-wider text-[#E8752D] flex items-center gap-2">
                  <Users size={16} /> Garuda Engineering Team Photo Placeholder
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 10. FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#002D2E] text-slate-300 py-16 border-t border-[#003B3C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">

            {/* Col 1: Brand & Description */}
            <div className="space-y-4 sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8752D] text-white flex items-center justify-center shadow-lg shadow-orange-600/30">
                  <ShieldCheck size={22} />
                </div>
                <span className="text-xl font-black text-white tracking-tight">GARUDA</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                Smart Campus Pass & Student Movement Engine designed for Keshav Memorial Educational Society campuses.
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#E8752D]">Quick Links</h4>
              <ul className="space-y-2 text-xs font-medium">
                <li><button onClick={() => scrollToSection('hero')} className="hover:text-white transition-colors cursor-pointer">Home</button></li>
                <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors cursor-pointer">About Garuda</button></li>
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Platform Features</button></li>
                <li><button onClick={() => scrollToSection('institutions')} className="hover:text-white transition-colors cursor-pointer">Institutions</button></li>
                <li><button onClick={() => scrollToSection('team')} className="hover:text-white transition-colors cursor-pointer">Meet the Team</button></li>
              </ul>
            </div>

            {/* Col 3: Campuses */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#E8752D]">Institutions</h4>
              <ul className="space-y-2 text-xs font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>KMIT — Active Live</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8752D]" />
                  <span>KMEC — Supported</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>NGIT — Active Live</span>
                </li>
              </ul>
            </div>

            {/* Col 4: Team Contacts */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#E8752D]">Team Contacts</h4>
              <ul className="space-y-2 text-xs font-medium text-slate-300">
                <li>
                  <a href="mailto:sai.kishor@kmit.in" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Mail size={12} className="text-[#E8752D]" /> Sai Kishor (Lead)
                  </a>
                </li>
                <li>
                  <a href="mailto:pranay.teja@kmit.in" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Mail size={12} className="text-teal-400" /> Pranay Teja
                  </a>
                </li>
                <li>
                  <a href="mailto:bharath.mahesh@kmit.in" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Mail size={12} className="text-teal-400" /> Bharath Mahesh
                  </a>
                </li>
                <li>
                  <a href="mailto:sanhith.reddy@kmit.in" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Mail size={12} className="text-teal-400" /> Sanhith Reddy
                  </a>
                </li>
                <li>
                  <a href="mailto:chandana@kmit.in" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Mail size={12} className="text-teal-400" /> Chandana
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 5: Portal Access */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#E8752D]">System Portal</h4>
              <p className="text-xs leading-relaxed text-slate-300">
                Access administrative dashboard, HOD portal, or security gate verification app.
              </p>
              <button
                onClick={handlePortalClick}
                className="w-full py-3 bg-[#E8752D] hover:bg-[#D96622] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{token ? 'Go to Dashboard' : 'Portal Login'}</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>

          <div className="pt-8 border-t border-[#003B3C] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
            <p>© 2026 Garuda Smart Campus Platform. All rights reserved.</p>
            <p className="text-teal-200">Built with pride by the Garuda Engineering Team for KMIT, KMEC, and NGIT.</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
