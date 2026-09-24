import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { Building2, Plus, RefreshCw, Shield, MapPin } from 'lucide-react';

export default function CollegesPage() {
  const token = useAuthStore(s => s.token);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [msg, setMsg] = useState('');

  const fetchColleges = () => {
    setLoading(true);
    axios.get('/api/admin/colleges', { headers })
      .then(res => setColleges(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await axios.post('/api/admin/colleges', { name, code, address }, { headers });
      setMsg('College created successfully!');
      setName('');
      setCode('');
      setAddress('');
      fetchColleges();
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Failed to create college.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-emerald-600 dark:text-emerald-400" />
            Institutional Colleges
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Manage colleges and institutional campuses in GARUDA
          </p>
        </div>
        <button
          onClick={fetchColleges}
          className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleCreate} className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Plus size={16} className="text-emerald-500" /> Add New College
        </h3>

        {msg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">College Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Keshav Memorial Engineering College"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Short Code</label>
            <input
              type="text"
              required
              placeholder="e.g. KMEC"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Address / Campus</label>
            <input
              type="text"
              placeholder="e.g. Hyderabad, Telangana"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 uppercase tracking-wider"
        >
          Save College
        </button>
      </form>

      {/* College List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {colleges.map((c: any) => (
          <div key={c.id} className="bg-white dark:bg-[#162032] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {c.code}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">{c.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin size={12} /> {c.address || "Main Campus"}
                </p>
              </div>
              <span className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                <Building2 size={20} />
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
              Institutional ID: #{c.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
