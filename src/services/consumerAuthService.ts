/**
 * Consumer Authentication Service
 * Communicates strictly with /api/consumer/* via typed API client.
 * Session key: 'akr_consumer_session'
 */

import { consumerApi } from '../core/api';
import { ConsumerSession } from '../core/types';
import { useStore } from '../store';

const CONSUMER_SESSION_KEY = 'akr_consumer_session';

export const consumerAuthService = {
  // REPLACE WITH API (Already calls consumerApi)
  login: async (identifier: string, password: string): Promise<ConsumerSession> => {
    const session = await consumerApi.login(identifier, password);
    useStore.getState().setConsumerSession(session);
    return session;
  },

  // REPLACE WITH API
  loginWithGoogle: async (): Promise<ConsumerSession> => {
    const session = await consumerApi.loginWithGoogle();
    useStore.getState().setConsumerSession(session);
    return session;
  },

  // REPLACE WITH API
  signUp: async (data: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    address?: string;
  }): Promise<ConsumerSession> => {
    const session = await consumerApi.signUp(data);
    useStore.getState().setConsumerSession(session);
    return session;
  },

  // REPLACE WITH API
  forgotPassword: async (identifier: string) => {
    return consumerApi.forgotPassword(identifier);
  },

  // REPLACE WITH API
  verifyOtp: async (otp: string) => {
    return consumerApi.verifyOtp(otp);
  },

  // REPLACE WITH API
  resetPassword: async (identifier: string, newPass: string) => {
    return consumerApi.resetPassword(identifier, newPass);
  },

  logout: () => {
    useStore.getState().setConsumerSession(null);
  },

  getSession: (): ConsumerSession | null => {
    try {
      const raw = localStorage.getItem(CONSUMER_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.userType === 'consumer') {
        return parsed as ConsumerSession;
      }
      return null;
    } catch {
      return null;
    }
  },
};
