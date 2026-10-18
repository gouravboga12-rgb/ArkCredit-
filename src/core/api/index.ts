/**
 * Typed REST API Client for AKR Credit Capital
 * 100% Framework-free (pure fetch & TypeScript).
 * Portable to React Native by pointing baseURL and swapping token retrieval.
 */

import {
  Consumer,
  ConsumerSession,
  AdminSession,
  DuesPlan,
  Payment,
  PaymentResult,
  CardType,
  AppNotification,
  ActivityLog,
  PlanType,
  PaymentMode,
  DueStatus,
  CardRequest,
} from '../types';

export class ApiClientError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

function getConsumerToken(): string | null {
  try {
    const raw = localStorage.getItem('akr_consumer_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsumerSession;
    return parsed.token || null;
  } catch {
    return null;
  }
}

function getAdminToken(): string | null {
  try {
    const raw = localStorage.getItem('akr_admin_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    return parsed.token || null;
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  tokenType: 'consumer' | 'admin' | 'none' = 'none'
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (tokenType === 'consumer') {
    const token = getConsumerToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } else if (tokenType === 'admin') {
    const token = getAdminToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiClientError(response.status, errorMessage, data);
  }

  return data as T;
}

// ==========================================
// CONSUMER API CLIENT
// ==========================================
export const consumerApi = {
  // Auth
  login: (identifier: string, password: string) =>
    request<ConsumerSession>('/consumer/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  loginWithGoogle: () =>
    request<ConsumerSession>('/consumer/auth/google', {
      method: 'POST',
    }),

  signUp: (payload: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    address?: string;
  }) =>
    request<ConsumerSession>('/consumer/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (identifier: string) =>
    request<{ message: string }>('/consumer/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  verifyOtp: (otp: string) =>
    request<{ valid: boolean }>('/consumer/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),

  resetPassword: (identifier: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/consumer/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, newPassword }),
    }),

  // Profile
  getProfile: () => request<Consumer>('/consumer/profile', {}, 'consumer'),

  updateProfile: (updates: Partial<Consumer>) =>
    request<Consumer>('/consumer/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'consumer'),

  // Dues & EMIs
  getDues: () =>
    request<{
      totalOutstanding: number;
      nextEmiAmount: number;
      nextEmiDate: string;
      isDueSoon: boolean;
      dueStatus: DueStatus;
      plans: DuesPlan[];
      allPlans: DuesPlan[];
    }>('/consumer/dues', {}, 'consumer'),

  // Payments
  initiatePayment: (payload: {
    planId: string | 'all';
    amount: number;
    mode: PaymentMode;
    simulateFailure?: boolean;
  }) =>
    request<PaymentResult>('/consumer/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 'consumer'),

  getPaymentHistory: () =>
    request<Payment[]>('/consumer/payments', {}, 'consumer'),

  // Cards
  getCards: () => request<CardType[]>('/consumer/cards', {}, 'consumer'),

  submitCardRequest: (data: Omit<CardRequest, 'id' | 'referenceNumber' | 'status' | 'createdAt' | 'updatedAt'>) =>
    request<CardRequest>('/consumer/cards/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'consumer'),

  // Notifications
  getNotifications: () =>
    request<AppNotification[]>('/consumer/notifications', {}, 'consumer'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/consumer/notifications/${id}/read`, {
      method: 'PUT',
    }, 'consumer'),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/consumer/notifications/read-all', {
      method: 'PUT',
    }, 'consumer'),
};

// ==========================================
// ADMIN API CLIENT
// ==========================================
export const adminApi = {
  login: (email: string, password: string) =>
    request<AdminSession>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getDashboard: () =>
    request<{
      totalConsumers: number;
      activeConsumers: number;
      totalOutstanding: number;
      totalCollected: number;
      upcomingPlansCount: number;
    }>('/admin/dashboard', {}, 'admin'),

  getConsumers: () =>
    request<Array<Consumer & {
      activePlansCount: number;
      totalOutstanding: number;
      nextEmiAmount: number;
      nextEmiDate: string;
      dueStatus: DueStatus;
    }>>('/admin/consumers', {}, 'admin'),

  createConsumer: (data: Omit<Consumer, 'id' | 'createdAt'>) =>
    request<Consumer>('/admin/consumers', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  updateConsumer: (id: string, updates: Partial<Consumer>) =>
    request<Consumer>(`/admin/consumers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'admin'),

  deleteConsumer: (id: string) =>
    request<{ success: boolean }>(`/admin/consumers/${id}`, {
      method: 'DELETE',
    }, 'admin'),

  getConsumerDues: (consumerId: string) =>
    request<DuesPlan[]>(`/admin/consumers/${consumerId}/dues`, {}, 'admin'),

  createDuesPlan: (data: any) =>
    request<DuesPlan>('/admin/dues', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  updateDuesPlan: (id: string, updates: Partial<DuesPlan>) =>
    request<DuesPlan>(`/admin/dues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'admin'),

  deleteDuesPlan: (id: string) =>
    request<{ success: boolean }>(`/admin/dues/${id}`, {
      method: 'DELETE',
    }, 'admin'),

  bulkUploadDues: (rows: any[]) =>
    request<{ successCount: number; errors: string[] }>('/admin/dues/bulk', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }, 'admin'),

  getPlanTypes: () => request<PlanType[]>('/admin/plan-types', {}, 'admin'),

  createPlanType: (data: Omit<PlanType, 'id'>) =>
    request<PlanType>('/admin/plan-types', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  updatePlanType: (id: string, updates: Partial<PlanType>) =>
    request<PlanType>(`/admin/plan-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'admin'),

  getPayments: () =>
    request<Array<Payment & {
      consumerName: string;
      consumerAccount: string;
      planTitle: string;
      planTypeName: string;
    }>>('/admin/payments', {}, 'admin'),

  recordOfflinePayment: (data: {
    consumerId: string;
    planId: string;
    amount: number;
    mode: PaymentMode;
    reference: string;
    date: string;
  }) =>
    request<PaymentResult>('/admin/payments/offline', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  getCards: () => request<CardType[]>('/admin/cards', {}, 'admin'),

  createCard: (data: Omit<CardType, 'id'>) =>
    request<CardType>('/admin/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  updateCard: (id: string, updates: Partial<CardType>) =>
    request<CardType>(`/admin/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'admin'),

  deleteCard: (id: string) =>
    request<{ success: boolean }>(`/admin/cards/${id}`, {
      method: 'DELETE',
    }, 'admin'),

  getNotifications: () =>
    request<AppNotification[]>('/admin/notifications', {}, 'admin'),

  createNotification: (data: {
    consumerId?: string;
    title: string;
    message: string;
    type: string;
  }) =>
    request<AppNotification>('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  getActivityLogs: () =>
    request<ActivityLog[]>('/admin/activity-log', {}, 'admin'),

  // Card Requests (Applications submitted via Inquire Now)
  getCardRequests: () =>
    request<CardRequest[]>('/admin/card-requests', {}, 'admin'),

  updateCardRequestStatus: (
    id: string,
    data: { status: 'approved' | 'rejected'; remarks?: string; creditLimit?: number }
  ) =>
    request<CardRequest>(`/admin/card-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'admin'),
};
