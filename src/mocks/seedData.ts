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
  CardRequest,
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

export const INITIAL_CONSUMERS: Consumer[] = [];

export const INITIAL_DUES_PLANS: DuesPlan[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

export const INITIAL_CARD_REQUESTS: CardRequest[] = [];

