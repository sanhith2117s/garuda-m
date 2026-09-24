import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';
import { Bell, Sparkles, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  created_at?: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: bool;
  created_at?: string;
}

export default function NotificationCenter() {
  const token = useAuthStore(s => s.token);
  const headers = { Authorization: `Bearer ${token}` };

  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [annRes, notifRes] = await Promise.all([
        axios.get('/api/announcements', { headers }),
        axios.get('/api/notifications', { headers })
      ]);
      setAnnouncements(annRes.data);
      setNotifications(notifRes.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await axios.post(`/api/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length + announcements.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications & Announcements"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Notifications</h3>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {/* Announcements Section */}
            {announcements.length > 0 && (
              <div className="p-2 space-y-2">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                  <Sparkles className="w-3 h-3" /> System Announcements
                </p>
                {announcements.map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-0.5">{a.title}</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{a.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 && announcements.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No new notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-3 text-xs flex items-start gap-2.5 transition-colors ${n.is_read ? 'opacity-70' : 'bg-slate-50/80 dark:bg-slate-800/40 font-semibold'}`}>
                  {n.type === 'alert' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : n.type === 'warning' ? (
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-0.5">
                    <h5 className="text-slate-800 dark:text-slate-200 font-bold">{n.title}</h5>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => handleMarkRead(n.id)} className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0">
                      Dismiss
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
