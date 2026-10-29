/**
 * Consumer Authentication Service
 * Communicates strictly with /api/consumer/* via typed API client.
 * Session key: 'akr_consumer_session'
 */

import { consumerApi } from '../core/api';
import { ConsumerSession, GoogleCheckResponse } from '../core/types';
import { useStore } from '../store';

const CONSUMER_SESSION_KEY = 'akr_consumer_session';

export const consumerAuthService = {
  // REPLACE WITH API (Already calls consumerApi)
  login: async (identifier: string, password: string): Promise<ConsumerSession> => {
    const session = await consumerApi.login(identifier, password);
    useStore.getState().setConsumerSession(session);
    return session;
  },

  // Login with Google (Registered users only)
  loginWithGoogle: async (payload?: {
    credential?: string;
    accessToken?: string;
  }): Promise<ConsumerSession> => {
    const session = await consumerApi.loginWithGoogle(payload);
    useStore.getState().setConsumerSession(session);
    return session;
  },

  // Check if a Google account is new or already registered
  checkGoogleAccount: async (payload: {
    credential?: string;
    accessToken?: string;
  }): Promise<GoogleCheckResponse> => {
    return consumerApi.checkGoogleAccount(payload);
  },

  // Register a new user via Google Sign-Up + basic registration details
  registerWithGoogle: async (payload: {
    credential?: string;
    accessToken?: string;
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    address?: string;
  }): Promise<ConsumerSession> => {
    const session = await consumerApi.registerWithGoogle(payload);
    useStore.getState().setConsumerSession(session);
    return session;
  },

  // Standard sign up
  signUp: async (data: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    address?: string;
    otp?: string;
  }): Promise<ConsumerSession> => {
    const session = await consumerApi.signUp(data);
    useStore.getState().setConsumerSession(session);
    return session;
  },

  // Send Registration OTP to Email
  sendSignUpOtp: async (data: {
    fullName: string;
    mobile: string;
    email: string;
  }) => {
    return consumerApi.sendSignUpOtp(data);
  },

  // Verify Registration OTP & Complete Account Creation
  verifySignUpAndCreate: async (data: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    address?: string;
    otp: string;
  }): Promise<ConsumerSession> => {
    const session = await consumerApi.verifySignUpAndCreate(data);
    useStore.getState().setConsumerSession(session);
    return session;
  },

  forgotPassword: async (identifier: string) => {
    return consumerApi.forgotPassword(identifier);
  },

  verifyOtp: async (otp: string, identifier?: string, purpose: string = 'forgot_password') => {
    return consumerApi.verifyOtp(otp, identifier, purpose);
  },

  resetPassword: async (identifier: string, newPass: string, otp?: string) => {
    return consumerApi.resetPassword(identifier, newPass, otp);
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
