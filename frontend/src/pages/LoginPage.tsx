import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Eye, EyeOff, User, Lock, ArrowRight } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.png';
import adminLogo from '../assets/admin.png';
import kmecLogo from '../assets/kmec.png';
import ngitLogo from '../assets/ngit.png';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const token = useAuthStore(state => state.token);
  const role = useAuthStore(state => state.role);
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRoleRedirectPath = (userRole?: string) => {
    if (userRole === 'security') return '/security';
    if (userRole === 'hod') return '/hod';
    if (userRole === 'mentor') return '/mentor';
    if (userRole === 'student') return '/student';
    return '/admin';
  };

  React.useEffect(() => {
    if (token) {
      navigate(getRoleRedirectPath(role), { replace: true });
    }
  }, [token, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', {
        identifier: identifier.trim(),
        password: password.trim()
      });

      const { access_token, role: userRole, college_id, college_name, college_code, username, full_name } = res.data;
      setAuth({
        token: access_token,
        role: userRole,
        collegeId: college_id,
        collegeName: college_name,
        collegeCode: college_code,
        username,
        fullName: full_name
      });
      navigate(getRoleRedirectPath(userRole));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c1117] flex flex-col items-center justify-center py-10 px-4 font-sans relative transition-colors duration-300 overflow-hidden">

      {/* Background Institutional Graphic Watermarks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-5 dark:opacity-10 flex items-center justify-between px-10">
        <img src={ngitLogo} alt="NGIT" className="w-80 h-80 object-contain -translate-x-16" />
        <img src={kmecLogo} alt="KMEC" className="w-80 h-80 object-contain translate-x-16" />
      </div>

      {/* Theme Toggle Positioned Top-Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 relative z-10 text-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-[#121922] rounded-[1.75rem] p-3.5 border border-slate-200/80 dark:border-white/10 shadow-lg flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300">
          <img src={logo} alt="GARUDA" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          GARUDA
        </h1>
        <p className="text-[11px] sm:text-xs font-bold text-[#E8752D] dark:text-[#e2a85c] uppercase tracking-[0.24em] mt-2">
          Campus movement, made accountable
        </p>
      </div>

      {/* Main Login Surface Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#121922] rounded-[2rem] shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 transition-all duration-300 relative z-10">

        <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-slate-900 dark:text-white font-extrabold text-xl tracking-tight">System Login</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">Enter your credentials to access the system</p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 p-3.5 rounded-2xl mb-6 text-xs font-bold border border-rose-200 dark:border-rose-800/60 animate-in fade-in duration-200">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Username / ID Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Username / ID
            </label>
            <div className="relative group">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E8752D] transition-colors" />
              <input
                type="text"
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#E8752D]/40 focus:border-[#E8752D] transition-all text-slate-900 dark:text-white text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Enter Username or ID"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative group">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E8752D] transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-12 focus:outline-none focus:ring-2 focus:ring-[#E8752D]/40 focus:border-[#E8752D] transition-all text-slate-900 dark:text-white text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8752D] hover:bg-[#D96622] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-xl transition-all mt-6 shadow-md shadow-orange-600/20 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>

        </form>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
        Official KMEC & NGIT Gate Pass System
      </div>

    </div>
  );
}
