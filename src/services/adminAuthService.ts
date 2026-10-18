/**
 * Admin Authentication Service
 * Communicates strictly with /api/admin/* via typed API client.
 * Session key: 'akr_admin_session'
 * Completely isolated from consumer session.
 */

import { adminApi } from '../core/api';
import { AdminSession } from '../core/types';
import { useStore } from '../store';

const ADMIN_SESSION_KEY = 'akr_admin_session';

export const adminAuthService = {
  // REPLACE WITH API (Already calls adminApi)
  login: async (email: string, password: string): Promise<AdminSession> => {
    const session = await adminApi.login(email, password);
    useStore.getState().setAdminSession(session);
    return session;
  },

  logout: () => {
    useStore.getState().setAdminSession(null);
  },

  getSession: (): AdminSession | null => {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.userType === 'admin') {
        return parsed as AdminSession;
      }
      return null;
    } catch {
      return null;
    }
  },
};
