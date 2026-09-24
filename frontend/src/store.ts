import { create } from 'zustand'

interface AuthState {
  token: string | null;
  role: string | null;
  collegeId: number | null;
  collegeName: string | null;
  collegeCode: string | null;
  username: string | null;
  fullName: string | null;
  setAuth: (data: {
    token: string;
    role: string;
    collegeId?: number | null;
    collegeName?: string | null;
    collegeCode?: string | null;
    username?: string | null;
    fullName?: string | null;
  }) => void;
  setCollegeContext: (collegeId: number | null, collegeName: string | null, collegeCode: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  collegeId: localStorage.getItem('collegeId') ? Number(localStorage.getItem('collegeId')) : null,
  collegeName: localStorage.getItem('collegeName'),
  collegeCode: localStorage.getItem('collegeCode'),
  username: localStorage.getItem('username'),
  fullName: localStorage.getItem('fullName'),
  setAuth: ({ token, role, collegeId, collegeName, collegeCode, username, fullName }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    if (collegeId) localStorage.setItem('collegeId', String(collegeId)); else localStorage.removeItem('collegeId');
    if (collegeName) localStorage.setItem('collegeName', collegeName); else localStorage.removeItem('collegeName');
    if (collegeCode) localStorage.setItem('collegeCode', collegeCode); else localStorage.removeItem('collegeCode');
    if (username) localStorage.setItem('username', username); else localStorage.removeItem('username');
    if (fullName) localStorage.setItem('fullName', fullName); else localStorage.removeItem('fullName');
    
    set({
      token,
      role,
      collegeId: collegeId ?? null,
      collegeName: collegeName ?? null,
      collegeCode: collegeCode ?? null,
      username: username ?? null,
      fullName: fullName ?? null,
    });
  },
  setCollegeContext: (collegeId, collegeName, collegeCode) => {
    if (collegeId) localStorage.setItem('collegeId', String(collegeId)); else localStorage.removeItem('collegeId');
    if (collegeName) localStorage.setItem('collegeName', collegeName); else localStorage.removeItem('collegeName');
    if (collegeCode) localStorage.setItem('collegeCode', collegeCode); else localStorage.removeItem('collegeCode');
    set({ collegeId, collegeName, collegeCode });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('collegeId');
    localStorage.removeItem('collegeName');
    localStorage.removeItem('collegeCode');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    set({
      token: null,
      role: null,
      collegeId: null,
      collegeName: null,
      collegeCode: null,
      username: null,
      fullName: null,
    });
  }
}))
