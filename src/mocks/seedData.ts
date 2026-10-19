/**
 * Default Seed Data for AKR Credit Capital
 * Contains 3 clean dummy consumers (Rahul Sharma, Priya Nair, Amit Patel),
 * plan types, dues plans, payment histories, card types, and admin accounts.
 */

import {
  Consumer,
  PlanType,
  DuesPlan,
  Payment,
  CardType,
  AppNotification,
  ActivityLog,
  AdminUser,
} from '../core/types';

export const INITIAL_PLAN_TYPES: PlanType[] = [
  {
    id: 'pt_saree_bridal',
    name: 'Bridal & Silk Sarees',
    category: 'SAREE_EMI',
    icon: 'shopping-bag',
    enabled: true,
  },
  {
    id: 'pt_handloom_wear',
    name: 'Handloom & Designer Wear',
    category: 'PRODUCT_PURCHASE',
    icon: 'sparkles',
    enabled: true,
  },
  {
    id: 'pt_jewellery',
    name: 'Jewellery & Accessories',
    category: 'RETAIL_PURCHASE',
    icon: 'wallet',
    enabled: true,
  },
  {
    id: 'pt_custom_store',
    name: 'Store Retail Purchase',
    category: 'CUSTOM_STORE',
    icon: 'shopping-bag',
    enabled: true,
  },
];

export const INITIAL_CARD_TYPES: CardType[] = [
  {
    id: 'card_emi_privilege',
    name: 'AKR EMI Privilege Card',
    imageUrl: 'https://images.unsplash.com/photo-1589758438368-0ad531db3366?auto=format&fit=crop&w=600&q=80',
    features: [
      'Flexible Limit: Up to ₹50,000 / ₹1,00,000',
      '0% Interest on Select Partner EMIs',
      'Instant Online Approval & Verification',
      'Convenient Weekly EMI Schedule',
    ],
    benefits: [
      'Pre-approved credit limit range customized to your profile',
      'Instant conversion of saree & retail purchases into weekly 0% interest EMIs',
      'Transparent tracking of used amount, available balance, and weekly schedule',
      'Zero annual maintenance fee & zero hidden charges',
    ],
    charges: {
      joiningFee: 0,
      annualFee: 0,
      interestRate: '0% Interest-Free on-time',
    },
    enabled: true,
  },
];

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'admin_super',
    name: 'Rajesh Varma',
    email: 'admin@akr.com',
    role: 'super_admin',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'admin_staff',
    name: 'Pooja Mehta',
    email: 'staff@akr.com',
    role: 'staff',
    createdAt: '2025-02-15T00:00:00.000Z',
  },
];

export const INITIAL_CONSUMERS: Consumer[] = [
  {
    id: 'c_rahul_4821',
    name: 'Rahul Sharma',
    mobile: '9876543210',
    email: 'rahul@example.com',
    address: '42, Prestige Palms, Indiranagar, Bengaluru, Karnataka 560038',
    accountNumber: 'AKR10004821',
    status: 'active',
    passwordHash: 'Demo@123',
    cardApproved: false,
    creditLimit: 0,
    cardStatus: 'not_applied',
    createdAt: '2025-03-10T10:00:00.000Z',
    notificationPreferences: {
      pushEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
      emiReminders: true,
      promotionalOffers: true,
    },
  },
  {
    id: 'c_priya_5512',
    name: 'Priya Nair',
    mobile: '9845012345',
    email: 'priya.nair@example.com',
    address: 'Flat 302, Green Glen Layout, Bellandur, Bengaluru 560103',
    accountNumber: 'AKR10005512',
    status: 'active',
    passwordHash: 'Demo@123',
    cardApproved: false,
    creditLimit: 0,
    cardStatus: 'not_applied',
    createdAt: '2025-03-15T11:00:00.000Z',
  },
  {
    id: 'c_amit_9823',
    name: 'Amit Patel',
    mobile: '9820011223',
    email: 'amit.patel@example.com',
    address: 'B-14, Shivalik Residency, Satellite, Ahmedabad 380015',
    accountNumber: 'AKR10009823',
    status: 'active',
    passwordHash: 'Demo@123',
    cardApproved: false,
    creditLimit: 0,
    cardStatus: 'not_applied',
    createdAt: '2025-03-18T12:00:00.000Z',
  },
];

// Clean start: No pre-existing loans or dues plans across dummy accounts
export const INITIAL_DUES_PLANS: DuesPlan[] = [];

// Clean start: No past dummy payments
export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome',
    consumerId: null, // Broadcast to all
    title: 'Welcome to AKR Credit Capital',
    message: 'Apply for the AKR EMI Privilege Card to enjoy 0% interest on silk sarees, bridal wear, and store purchases.',
    type: 'general',
    read: false,
    createdAt: '2026-10-18T09:00:00.000Z',
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log_init',
    adminUser: 'System',
    action: 'SYSTEM_INITIALIZATION',
    consumerId: 'system',
    consumerName: 'System',
    oldValue: '-',
    newValue: 'AKR Credit Capital weekly retail platform ready',
    createdAt: '2026-10-19T00:00:00.000Z',
  },
];

// Clean start: No pre-existing card requests so dummy accounts can freshly apply
export const INITIAL_CARD_REQUESTS: any[] = [];

