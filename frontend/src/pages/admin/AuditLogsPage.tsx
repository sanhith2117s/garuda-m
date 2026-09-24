import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store';
import { ShieldAlert, Search, RefreshCw, Clock, User } from 'lucide-react';
import { fmtDate } from '../../utils/dateUtils';

interface AuditLogItem {
  id: number;
  username: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const token = useAuthStore(s => s.token);
  const collegeId = useAuthStore(s => s.collegeId);
  const headers = { Authorization: `Bearer ${token}` };

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (collegeId) params.set('college_id', String(collegeId));
      if (roleFilter) params.set('role', roleFilter);
      if (actionFilter) params.set('action', actionFilter);

      const res = await axios.get(`/api/admin/audit-logs?${params.toString()}`, { headers });
      setLogs(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLogs();
  }, [collegeId, roleFilter, actionFilter]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-500" /> System Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete audit trail recording pass approvals, emergency exceptions, administrative edits, and configuration changes.
          </p>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <select 
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
        >
          <option value="">All User Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="hod">HOD</option>
          <option value="mentor">Mentor</option>
          <option value="security">Security</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Filter by action name..."
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 italic">No audit records found for the selected criteria.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{log.action}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs font-medium">{log.details}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right sm:text-right">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 justify-end">
                      <User className="w-3.5 h-3.5 text-slate-400" /> {log.username}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">{fmtDate(log.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
