/**
 * Central Data Store (Zustand)
 * Acts as the mock database backing the REST API handlers (MSW).
 * Both Consumer and Admin sides share this persisted store.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Consumer,
  AdminUser,
  PlanType,
  DuesPlan,
  Payment,
  CardType,
  AppNotification,
  ActivityLog,
  ConsumerSession,
  AdminSession,
  PaymentResult,
  PaymentMode,
  CardRequest,
} from '../core/types';
import {
  INITIAL_CONSUMERS,
  INITIAL_ADMIN_USERS,
  INITIAL_PLAN_TYPES,
  INITIAL_DUES_PLANS,
  INITIAL_PAYMENTS,
  INITIAL_CARD_TYPES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_CARD_REQUESTS,
} from '../mocks/seedData';
import { applyPaymentToPlan, allocatePayAllAmount } from '../core/domain';

interface StoreState {
  // Collections
  consumers: Consumer[];
  adminUsers: AdminUser[];
  planTypes: PlanType[];
  duesPlans: DuesPlan[];
  payments: Payment[];
  cardTypes: CardType[];
  cardRequests: CardRequest[];
  notifications: AppNotification[];
  activityLogs: ActivityLog[];

  // Sessions (separate keys)
  consumerSession: ConsumerSession | null;
  adminSession: AdminSession | null;

  // Dev flags
  simulateNetworkError: boolean;
  latencyMs: number;

  // Actions
  resetDemoData: () => void;
  setSimulateNetworkError: (val: boolean) => void;

  // Auth actions
  setConsumerSession: (session: ConsumerSession | null) => void;
  setAdminSession: (session: AdminSession | null) => void;

  // Consumer operations
  updateConsumerProfile: (consumerId: string, updates: Partial<Consumer>) => Consumer | null;
  addConsumer: (consumer: Omit<Consumer, 'id' | 'createdAt'>) => Consumer;
  updateConsumerByAdmin: (consumerId: string, updates: Partial<Consumer>, adminName: string) => Consumer | null;
  deleteConsumerByAdmin: (consumerId: string, adminName: string) => boolean;

  // Plan Type operations
  addPlanType: (pt: Omit<PlanType, 'id'>, adminName: string) => PlanType;
  updatePlanType: (id: string, updates: Partial<PlanType>, adminName: string) => PlanType | null;

  // Dues Plan operations
  addDuesPlan: (plan: Omit<DuesPlan, 'id' | 'createdAt' | 'updatedAt'>, adminName: string) => DuesPlan;
  updateDuesPlan: (id: string, updates: Partial<DuesPlan>, adminName: string) => DuesPlan | null;
  deleteDuesPlan: (id: string, adminName: string) => boolean;
  bulkUpsertDuesPlans: (
    rows: Array<{
      accountNumber: string;
      planType: string;
      planReference: string;
      outstanding: number;
      principal: number;
      interest: number;
      processingFee: number;
      emiAmount: number;
      nextEmiDate: string;
      totalEmis: number;
      remainingEmis: number;
      tenureMonths: number;
    }>,
    adminName: string
  ) => { successCount: number; errors: string[] };
  setPlanOverdueFee: (
    planId: string,
    overdueAmount: number,
    missedWeeks: number,
    remarks: string,
    adminName: string
  ) => DuesPlan | null;

  // Payment operations
  executePayment: (
    consumerId: string,
    planId: string | 'all',
    amount: number,
    mode: PaymentMode,
    source?: 'online' | 'offline',
    customRef?: string
  ) => PaymentResult;

  // Card Type operations
  addCardType: (card: Omit<CardType, 'id'>, adminName: string) => CardType;
  updateCardType: (id: string, updates: Partial<CardType>, adminName: string) => CardType | null;
  deleteCardType: (id: string, adminName: string) => boolean;

  // Card Request operations
  addCardRequest: (req: Omit<CardRequest, 'id' | 'referenceNumber' | 'status' | 'createdAt' | 'updatedAt'>) => CardRequest;
  updateCardRequestStatus: (
    id: string,
    status: 'approved' | 'rejected',
    adminName: string,
    remarks?: string,
    creditLimit?: number
  ) => CardRequest | null;

  // Notification operations
  sendNotification: (
    notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
    adminName?: string
  ) => AppNotification;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (consumerId: string) => void;

  // Activity Log
  logActivity: (entry: Omit<ActivityLog, 'id' | 'createdAt'>) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      consumers: INITIAL_CONSUMERS,
      adminUsers: INITIAL_ADMIN_USERS,
      planTypes: INITIAL_PLAN_TYPES,
      duesPlans: INITIAL_DUES_PLANS,
      payments: INITIAL_PAYMENTS,
      cardTypes: INITIAL_CARD_TYPES,
      cardRequests: INITIAL_CARD_REQUESTS,
      notifications: INITIAL_NOTIFICATIONS,
      activityLogs: INITIAL_ACTIVITY_LOGS,

      consumerSession: null,
      adminSession: null,

      simulateNetworkError: false,
      latencyMs: 350,

      resetDemoData: () => {
        set({
          consumers: INITIAL_CONSUMERS,
          adminUsers: INITIAL_ADMIN_USERS,
          planTypes: INITIAL_PLAN_TYPES,
          duesPlans: INITIAL_DUES_PLANS,
          payments: INITIAL_PAYMENTS,
          cardTypes: INITIAL_CARD_TYPES,
          cardRequests: INITIAL_CARD_REQUESTS,
          notifications: INITIAL_NOTIFICATIONS,
          activityLogs: INITIAL_ACTIVITY_LOGS,
          consumerSession: null,
          adminSession: null,
        });
        // Clear explicit session keys from storage
        localStorage.removeItem('akr_consumer_session');
        localStorage.removeItem('akr_admin_session');
      },

      setSimulateNetworkError: (val) => set({ simulateNetworkError: val }),

      setConsumerSession: (session) => {
        set({ consumerSession: session });
        if (session) {
          localStorage.setItem('akr_consumer_session', JSON.stringify(session));
        } else {
          localStorage.removeItem('akr_consumer_session');
        }
      },

      setAdminSession: (session) => {
        set({ adminSession: session });
        if (session) {
          localStorage.setItem('akr_admin_session', JSON.stringify(session));
        } else {
          localStorage.removeItem('akr_admin_session');
        }
      },

      updateConsumerProfile: (consumerId, updates) => {
        const { consumers } = get();
        const index = consumers.findIndex((c) => c.id === consumerId);
        if (index === -1) return null;

        const updated = { ...consumers[index], ...updates };
        const newConsumers = [...consumers];
        newConsumers[index] = updated;

        // Also update consumer in consumerSession if active
        const { consumerSession } = get();
        let newSession = consumerSession;
        if (consumerSession && consumerSession.consumer.id === consumerId) {
          newSession = { ...consumerSession, consumer: updated };
          localStorage.setItem('akr_consumer_session', JSON.stringify(newSession));
        }

        set({ consumers: newConsumers, consumerSession: newSession });
        return updated;
      },

      addConsumer: (consumerData) => {
        const id = `c_${Date.now()}`;
        const newConsumer: Consumer = {
          ...consumerData,
          id,
          createdAt: new Date().toISOString(),
          cardApproved: consumerData.cardApproved ?? false,
          cardStatus: consumerData.cardStatus ?? 'not_applied',
        };
        set((state) => ({ consumers: [newConsumer, ...state.consumers] }));
        return newConsumer;
      },

      updateConsumerByAdmin: (consumerId, updates, adminName) => {
        const { consumers } = get();
        const oldConsumer = consumers.find((c) => c.id === consumerId);
        if (!oldConsumer) return null;

        const updatedConsumer: Consumer = { ...oldConsumer, ...updates };
        const newConsumers = consumers.map((c) => (c.id === consumerId ? updatedConsumer : c));

        get().logActivity({
          adminUser: adminName,
          action: 'UPDATE_CONSUMER',
          consumerId,
          consumerName: updatedConsumer.name,
          oldValue: `Status: ${oldConsumer.status}, Email: ${oldConsumer.email}`,
          newValue: `Status: ${updatedConsumer.status}, Email: ${updatedConsumer.email}`,
        });

        // Also update consumer in consumerSession if active
        const { consumerSession } = get();
        let newSession = consumerSession;
        if (consumerSession && consumerSession.consumer.id === consumerId) {
          newSession = { ...consumerSession, consumer: updatedConsumer };
          localStorage.setItem('akr_consumer_session', JSON.stringify(newSession));
        }

        set({ consumers: newConsumers, consumerSession: newSession });
        return updatedConsumer;
      },

      deleteConsumerByAdmin: (consumerId, adminName) => {
        const { consumers } = get();
        const consumer = consumers.find((c) => c.id === consumerId);
        if (!consumer) return false;

        get().logActivity({
          adminUser: adminName,
          action: 'DELETE_CONSUMER',
          consumerId,
          consumerName: consumer.name,
          oldValue: `${consumer.name} (${consumer.accountNumber})`,
          newValue: 'DELETED',
        });

        set((state) => ({
          consumers: state.consumers.filter((c) => c.id !== consumerId),
          duesPlans: state.duesPlans.filter((p) => p.consumerId !== consumerId),
        }));
        return true;
      },

      addPlanType: (ptData, adminName) => {
        const id = `pt_${Date.now()}`;
        const newPt: PlanType = { ...ptData, id };

        get().logActivity({
          adminUser: adminName,
          action: 'ADD_PLAN_TYPE',
          consumerId: '-',
          consumerName: 'System Master Data',
          oldValue: '-',
          newValue: `${newPt.name} (${newPt.category})`,
        });

        set((state) => ({ planTypes: [...state.planTypes, newPt] }));
        return newPt;
      },

      updatePlanType: (id, updates, adminName) => {
        const { planTypes } = get();
        const oldPt = planTypes.find((p) => p.id === id);
        if (!oldPt) return null;

        const updatedPt = { ...oldPt, ...updates };
        get().logActivity({
          adminUser: adminName,
          action: 'UPDATE_PLAN_TYPE',
          consumerId: '-',
          consumerName: 'System Master Data',
          oldValue: `${oldPt.name} (enabled: ${oldPt.enabled})`,
          newValue: `${updatedPt.name} (enabled: ${updatedPt.enabled})`,
        });

        set((state) => ({
          planTypes: state.planTypes.map((p) => (p.id === id ? updatedPt : p)),
        }));
        return updatedPt;
      },

      addDuesPlan: (planData, adminName) => {
        const id = `plan_${Date.now()}`;
        const now = new Date().toISOString();
        const newPlan: DuesPlan = {
          ...planData,
          id,
          createdAt: now,
          updatedAt: now,
        };

        const consumer = get().consumers.find((c) => c.id === newPlan.consumerId);

        get().logActivity({
          adminUser: adminName,
          action: 'CREATE_DUES_PLAN',
          consumerId: newPlan.consumerId,
          consumerName: consumer?.name || 'Consumer',
          oldValue: '-',
          newValue: `${newPlan.title}: Outstanding ₹${newPlan.outstandingAmount}`,
        });

        // Trigger balance update notification for consumer
        get().sendNotification({
          consumerId: newPlan.consumerId,
          title: 'New Dues Plan Added',
          message: `A new plan "${newPlan.title}" with outstanding ₹${newPlan.outstandingAmount} has been registered to your account.`,
          type: 'balance_update',
        });

        set((state) => ({ duesPlans: [newPlan, ...state.duesPlans] }));
        return newPlan;
      },

      updateDuesPlan: (id, updates, adminName) => {
        const { duesPlans } = get();
        const oldPlan = duesPlans.find((p) => p.id === id);
        if (!oldPlan) return null;

        const updatedPlan: DuesPlan = {
          ...oldPlan,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        const consumer = get().consumers.find((c) => c.id === updatedPlan.consumerId);

        get().logActivity({
          adminUser: adminName,
          action: 'UPDATE_DUES_PLAN',
          consumerId: updatedPlan.consumerId,
          consumerName: consumer?.name || 'Consumer',
          oldValue: `Outstanding: ₹${oldPlan.outstandingAmount}, Next EMI: ${oldPlan.nextEmiDate}`,
          newValue: `Outstanding: ₹${updatedPlan.outstandingAmount}, Next EMI: ${updatedPlan.nextEmiDate}`,
        });

        // Balance update notification
        get().sendNotification({
          consumerId: updatedPlan.consumerId,
          title: 'Dues Plan Updated',
          message: `Your plan "${updatedPlan.title}" has been updated. Current outstanding: ₹${updatedPlan.outstandingAmount}. Next EMI date: ${updatedPlan.nextEmiDate}.`,
          type: 'balance_update',
        });

        set((state) => ({
          duesPlans: state.duesPlans.map((p) => (p.id === id ? updatedPlan : p)),
        }));
        return updatedPlan;
      },

      deleteDuesPlan: (id, adminName) => {
        const { duesPlans } = get();
        const plan = duesPlans.find((p) => p.id === id);
        if (!plan) return false;

        const consumer = get().consumers.find((c) => c.id === plan.consumerId);
        get().logActivity({
          adminUser: adminName,
          action: 'DELETE_DUES_PLAN',
          consumerId: plan.consumerId,
          consumerName: consumer?.name || 'Consumer',
          oldValue: `${plan.title} (₹${plan.outstandingAmount})`,
          newValue: 'DELETED',
        });

        set((state) => ({
          duesPlans: state.duesPlans.filter((p) => p.id !== id),
        }));
        return true;
      },

      bulkUpsertDuesPlans: (rows, adminName) => {
        const { consumers, planTypes, duesPlans } = get();
        let successCount = 0;
        const errors: string[] = [];

        const updatedPlans = [...duesPlans];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2; // considering header is row 1
          const consumer = consumers.find((c) => c.accountNumber.trim() === row.accountNumber.trim());
          if (!consumer) {
            errors.push(`Row ${rowNum}: Account number "${row.accountNumber}" not found.`);
            return;
          }

          const pt = planTypes.find(
            (p) =>
              p.name.toLowerCase().trim() === row.planType.toLowerCase().trim() ||
              p.category.toLowerCase().trim() === row.planType.toLowerCase().trim()
          );

          if (!pt) {
            errors.push(`Row ${rowNum}: Unknown plan_type "${row.planType}".`);
            return;
          }

          if (!pt.enabled) {
            errors.push(`Row ${rowNum}: Plan type "${row.planType}" is disabled.`);
            return;
          }

          const existingIndex = updatedPlans.findIndex(
            (p) =>
              p.consumerId === consumer.id &&
              p.referenceNumber.toLowerCase().trim() === row.planReference.toLowerCase().trim()
          );

          const now = new Date().toISOString();

          if (existingIndex !== -1) {
            // Update
            const old = updatedPlans[existingIndex];
            updatedPlans[existingIndex] = {
              ...old,
              planTypeId: pt.id,
              outstandingAmount: row.outstanding,
              principal: row.principal,
              interest: row.interest,
              processingFee: row.processingFee,
              emiAmount: row.emiAmount,
              nextEmiDate: row.nextEmiDate,
              totalEmis: row.totalEmis,
              remainingEmis: row.remainingEmis,
              tenureMonths: row.tenureMonths,
              status: row.outstanding === 0 ? 'closed' : 'active',
              updatedAt: now,
            };
          } else {
            // Insert
            const newPlan: DuesPlan = {
              id: `plan_${Date.now()}_${idx}`,
              consumerId: consumer.id,
              planTypeId: pt.id,
              title: `${pt.name} - ${row.planReference}`,
              referenceNumber: row.planReference,
              status: row.outstanding === 0 ? 'closed' : 'active',
              outstandingAmount: row.outstanding,
              totalPaymentDue: row.outstanding,
              principal: row.principal,
              interest: row.interest,
              processingFee: row.processingFee,
              emiAmount: row.emiAmount,
              nextEmiDate: row.nextEmiDate,
              totalEmis: row.totalEmis,
              remainingEmis: row.remainingEmis,
              tenureMonths: row.tenureMonths,
              createdAt: now,
              updatedAt: now,
            };
            updatedPlans.push(newPlan);
          }

          successCount++;
        });

        if (successCount > 0) {
          get().logActivity({
            adminUser: adminName,
            action: 'BULK_CSV_DUES_UPDATE',
            consumerId: '-',
            consumerName: 'Multiple Consumers',
            oldValue: '-',
            newValue: `Processed ${successCount} plan records successfully.`,
          });
          set({ duesPlans: updatedPlans });
        }

        return { successCount, errors };
      },

      executePayment: (
        consumerId,
        planId,
        amount,
        mode,
        source = 'online',
        customRef
      ) => {
        const { duesPlans, payments, consumers } = get();
        const consumer = consumers.find((c) => c.id === consumerId);
        const consumerPlans = duesPlans.filter((p) => p.consumerId === consumerId && p.status === 'active');

        const now = new Date();
        const nowIso = now.toISOString();
        const dateTag = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const transactionRef = `TXN-AKR-${dateTag}-${randomNum}`;
        const receiptNumber = customRef || `REC-${dateTag}-${randomNum}`;

        const createdPayments: Payment[] = [];
        let updatedPlans = [...duesPlans];

        if (planId === 'all') {
          // Pay All - Allocate across active plans
          const allocations = allocatePayAllAmount(amount, consumerPlans);

          allocations.forEach((alloc, i) => {
            if (alloc.allocatedAmount <= 0) return;

            const targetPlan = updatedPlans.find((p) => p.id === alloc.planId);
            if (!targetPlan) return;

            const isEmi = alloc.allocatedAmount >= targetPlan.emiAmount;
            let updated = applyPaymentToPlan(targetPlan, alloc.allocatedAmount, isEmi);
            if (targetPlan.overdueAmount) {
              updated = {
                ...updated,
                overdueAmount: 0,
                missedMonths: 0,
                overdueRemarks: undefined,
              };
            }

            updatedPlans = updatedPlans.map((p) => (p.id === alloc.planId ? updated : p));

            const paymentRec: Payment = {
              id: `pay_${Date.now()}_${i}`,
              transactionRef,
              consumerId,
              planId: alloc.planId,
              planTypeId: targetPlan.planTypeId,
              amount: alloc.allocatedAmount,
              mode,
              status: 'success',
              reference: receiptNumber,
              source,
              createdAt: nowIso,
            };
            createdPayments.push(paymentRec);
          });
        } else {
          // Pay specific plan
          const targetPlan = updatedPlans.find((p) => p.id === planId);
          if (targetPlan) {
            const isEmi = amount >= targetPlan.emiAmount;
            let updated = applyPaymentToPlan(targetPlan, amount, isEmi);
            if (targetPlan.overdueAmount) {
              updated = {
                ...updated,
                overdueAmount: 0,
                missedMonths: 0,
                overdueRemarks: undefined,
              };
            }
            updatedPlans = updatedPlans.map((p) => (p.id === planId ? updated : p));

            const paymentRec: Payment = {
              id: `pay_${Date.now()}`,
              transactionRef,
              consumerId,
              planId,
              planTypeId: targetPlan.planTypeId,
              amount,
              mode,
              status: 'success',
              reference: receiptNumber,
              source,
              createdAt: nowIso,
            };
            createdPayments.push(paymentRec);
          }
        }

        // Add payment confirmation notification
        get().sendNotification({
          consumerId,
          title: 'Payment Successful',
          message: `Your payment of ₹${amount.toLocaleString('en-IN')} via ${mode} has been received. Reference: ${transactionRef}.`,
          type: 'payment_confirmation',
        });

        // If offline payment, log activity
        if (source === 'offline') {
          get().logActivity({
            adminUser: 'Staff Admin',
            action: 'RECORD_OFFLINE_PAYMENT',
            consumerId,
            consumerName: consumer?.name || 'Consumer',
            oldValue: `Payment Mode: ${mode}`,
            newValue: `Amount: ₹${amount}, Ref: ${receiptNumber}`,
          });
        }

        set({
          duesPlans: updatedPlans,
          payments: [...createdPayments, ...payments],
        });

        return {
          success: true,
          status: 'success',
          transactionRef,
          amount,
          mode,
          date: nowIso,
          receiptNumber,
          payments: createdPayments,
        };
      },

      addCardType: (cardData, adminName) => {
        const id = `card_${Date.now()}`;
        const newCard: CardType = { ...cardData, id };

        get().logActivity({
          adminUser: adminName,
          action: 'CREATE_CARD_TYPE',
          consumerId: '-',
          consumerName: 'System Master Data',
          oldValue: '-',
          newValue: `${newCard.name} (enabled: ${newCard.enabled})`,
        });

        set((state) => ({ cardTypes: [...state.cardTypes, newCard] }));
        return newCard;
      },

      updateCardType: (id, updates, adminName) => {
        const { cardTypes } = get();
        const oldCard = cardTypes.find((c) => c.id === id);
        if (!oldCard) return null;

        const updatedCard = { ...oldCard, ...updates };

        get().logActivity({
          adminUser: adminName,
          action: 'UPDATE_CARD_TYPE',
          consumerId: '-',
          consumerName: 'System Master Data',
          oldValue: `${oldCard.name} (enabled: ${oldCard.enabled})`,
          newValue: `${updatedCard.name} (enabled: ${updatedCard.enabled})`,
        });

        set((state) => ({
          cardTypes: state.cardTypes.map((c) => (c.id === id ? updatedCard : c)),
        }));
        return updatedCard;
      },

      deleteCardType: (id, adminName) => {
        const { cardTypes } = get();
        const card = cardTypes.find((c) => c.id === id);
        if (!card) return false;

        get().logActivity({
          adminUser: adminName,
          action: 'DELETE_CARD_TYPE',
          consumerId: '-',
          consumerName: 'System Master Data',
          oldValue: `${card.name}`,
          newValue: 'DELETED',
        });

        set((state) => ({
          cardTypes: state.cardTypes.filter((c) => c.id !== id),
        }));
        return true;
      },

      addCardRequest: (reqData) => {
        const id = `req_${Date.now()}`;
        const referenceNumber = `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date().toISOString();
        const newRequest: CardRequest = {
          ...reqData,
          id,
          referenceNumber,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ cardRequests: [newRequest, ...state.cardRequests] }));

        // Notify admins / user
        get().sendNotification({
          consumerId: reqData.consumerId || null,
          title: 'Card Request Submitted',
          message: `Your application for ${reqData.cardTypeName} (Ref: ${referenceNumber}) has been submitted successfully for verification.`,
          type: 'general',
        });

        return newRequest;
      },

      setPlanOverdueFee: (planId, overdueAmount, missedWeeks, remarks, adminName) => {
        const { duesPlans, consumers } = get();
        const plan = duesPlans.find((p) => p.id === planId);
        if (!plan) return null;
        const consumer = consumers.find((c) => c.id === plan.consumerId);

        const updatedPlan: DuesPlan = {
          ...plan,
          overdueAmount,
          missedWeeks: missedWeeks || 1,
          missedMonths: missedWeeks || 1,
          overdueRemarks: remarks,
          overdueAssignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedPlans = duesPlans.map((p) => (p.id === planId ? updatedPlan : p));

        get().logActivity({
          adminUser: adminName,
          action: 'LEVY_OVERDUE_FEE',
          consumerId: plan.consumerId,
          consumerName: consumer?.name || 'Consumer',
          oldValue: `Overdue: ₹${plan.overdueAmount || 0}`,
          newValue: `Late Fee: ₹${overdueAmount} (${missedWeeks || 1} wk, total: ₹${(plan.emiAmount * (missedWeeks || 1)) + overdueAmount})`,
        });

        get().sendNotification({
          consumerId: plan.consumerId,
          title: '⚠️ Overdue Notice & Late Fee Applied',
          message: `A late payment charge of ₹${overdueAmount.toLocaleString('en-IN')} has been applied to "${plan.title}". Total overdue payable is ₹${((plan.emiAmount * (missedWeeks || 1)) + overdueAmount).toLocaleString('en-IN')}. Please clear immediately.`,
          type: 'emi_reminder',
        });

        set({ duesPlans: updatedPlans });
        return updatedPlan;
      },

      updateCardRequestStatus: (id, status, adminName, remarks, creditLimit) => {
        const { cardRequests } = get();
        const target = cardRequests.find((r) => r.id === id);
        if (!target) return null;
        const now = new Date().toISOString();
        const approvedLimit = creditLimit !== undefined ? creditLimit : (target.creditLimitApproved || 50000);
        const updated: CardRequest = {
          ...target,
          status,
          adminRemarks: remarks || target.adminRemarks,
          creditLimitApproved: status === 'approved' ? approvedLimit : target.creditLimitApproved,
          updatedAt: now,
        };

        // Sync Consumer: When approved, mark cardApproved: true and assign credit limit!
        const { consumers, consumerSession } = get();
        let updatedConsumers = [...consumers];
        let foundConsumer = updatedConsumers.find(
          (c) => (target.consumerId && c.id === target.consumerId) ||
                 c.mobile === target.phone ||
                 (target.email && c.email.toLowerCase() === target.email.toLowerCase())
        );

        let newSession = consumerSession;
        const cardNum = `51${Math.floor(10 + Math.random() * 90)} •••• •••• ${target.phone.slice(-4)}`;

        if (status === 'approved') {
          if (foundConsumer) {
            foundConsumer = {
              ...foundConsumer,
              cardApproved: true,
              cardStatus: 'approved',
              creditLimit: approvedLimit,
              cardNumber: foundConsumer.cardNumber || cardNum,
            };
            updatedConsumers = updatedConsumers.map((c) => (c.id === foundConsumer!.id ? foundConsumer! : c));
          } else {
            // Create approved consumer so they now appear in admin consumers page!
            const newAccSuffix = Math.floor(1000 + Math.random() * 9000);
            foundConsumer = {
              id: target.consumerId || `c_${Date.now()}`,
              name: target.fullName,
              mobile: target.phone,
              email: target.email || `user${newAccSuffix}@akr.com`,
              address: target.address,
              accountNumber: `AKR1000${newAccSuffix}`,
              status: 'active',
              passwordHash: 'Demo@123',
              cardApproved: true,
              creditLimit: approvedLimit,
              cardStatus: 'approved',
              cardNumber: cardNum,
              createdAt: target.createdAt || now,
            };
            updatedConsumers = [foundConsumer, ...updatedConsumers];
          }

          // CRITICAL: Always synchronize the isolated consumer session in localStorage
          try {
            const rawSession = localStorage.getItem('akr_consumer_session');
            if (rawSession) {
              const parsed = JSON.parse(rawSession);
              if (parsed?.consumer && (parsed.consumer.id === foundConsumer.id || parsed.consumer.mobile === target.phone)) {
                parsed.consumer = foundConsumer;
                localStorage.setItem('akr_consumer_session', JSON.stringify(parsed));
                newSession = parsed;
              }
            }
          } catch (e) {}

          if (consumerSession && (consumerSession.consumer.id === foundConsumer.id || consumerSession.consumer.mobile === target.phone)) {
            newSession = { ...consumerSession, consumer: foundConsumer };
          }
        }

        set({
          cardRequests: cardRequests.map((r) => (r.id === id ? updated : r)),
          consumers: updatedConsumers,
          consumerSession: newSession,
        });

        get().logActivity({
          adminUser: adminName,
          action: status === 'approved' ? 'APPROVE_CARD_REQUEST' : 'REJECT_CARD_REQUEST',
          consumerId: target.consumerId || foundConsumer?.id || 'applicant',
          consumerName: target.fullName,
          oldValue: `Status: ${target.status}`,
          newValue: `Status: ${status} (Card: ${target.cardTypeName}, Limit: ₹${approvedLimit.toLocaleString('en-IN')})`,
        });

        if (target.consumerId || foundConsumer) {
          get().sendNotification({
            consumerId: target.consumerId || foundConsumer!.id,
            title: status === 'approved' ? 'Card Application Approved! 🎉' : 'Card Application Update',
            message:
              status === 'approved'
                ? `Congratulations! Your ${target.cardTypeName} application (${target.referenceNumber}) has been approved with a limit of ₹${approvedLimit.toLocaleString('en-IN')}.`
                : `Your ${target.cardTypeName} application (${target.referenceNumber}) could not be approved at this time. ${remarks || ''}`,
            type: 'general',
          });
        }

        return updated;
      },

      sendNotification: (notifData) => {
        const id = `notif_${Date.now()}`;
        const newNotif: AppNotification = {
          ...notifData,
          id,
          read: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ notifications: [newNotif, ...state.notifications] }));
        return newNotif;
      },

      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllNotificationsAsRead: (consumerId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.consumerId === consumerId || n.consumerId === null ? { ...n, read: true } : n
          ),
        }));
      },

      logActivity: (entry) => {
        const id = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const newLog: ActivityLog = {
          ...entry,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ activityLogs: [newLog, ...state.activityLogs] }));
      },
    }),
    {
      name: 'akr_credit_capital_data_store',
      version: 5,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState || {};
        if (version < 4) {
          state = {
            ...state,
            consumers: INITIAL_CONSUMERS,
            duesPlans: INITIAL_DUES_PLANS,
            payments: INITIAL_PAYMENTS,
            cardTypes: INITIAL_CARD_TYPES,
            cardRequests: INITIAL_CARD_REQUESTS,
            notifications: INITIAL_NOTIFICATIONS,
            activityLogs: INITIAL_ACTIVITY_LOGS,
            consumerSession: { consumer: INITIAL_CONSUMERS[0], token: 'mock-consumer-token-123' },
          };
        }
        if (version < 5) {
          // If cardRequests is empty or missing, populate with INITIAL_CARD_REQUESTS
          const existing = Array.isArray(state.cardRequests) && state.cardRequests.length > 0
            ? state.cardRequests
            : INITIAL_CARD_REQUESTS;
          state = {
            ...state,
            cardRequests: existing,
          };
        }
        return state;
      },
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (typeof window === 'undefined') return;
        // Restore isolated consumer session if store's consumerSession was cleared by an admin tab write
        let cSession = state?.consumerSession;
        if (!cSession) {
          try {
            const raw = localStorage.getItem('akr_consumer_session');
            if (raw) {
              const session = JSON.parse(raw);
              if (session?.userType === 'consumer') {
                cSession = session;
                useStore.setState({ consumerSession: session });
              }
            }
          } catch (e) {}
        }

        // Restore isolated admin session if store's adminSession was cleared by a consumer tab write
        if (!state?.adminSession) {
          try {
            const raw = localStorage.getItem('akr_admin_session');
            if (raw) {
              const session = JSON.parse(raw);
              if (session?.userType === 'admin') {
                useStore.setState({ adminSession: session });
              }
            }
          } catch (e) {}
        }

        // Reconcile approved card requests with consumers list
        if (state?.cardRequests && state?.consumers) {
          let consumersNeedUpdate = false;
          const updatedConsumers = state.consumers.map((c: Consumer) => {
            const approvedReq = state.cardRequests.find(
              (r: CardRequest) =>
                (r.consumerId === c.id || r.phone === c.mobile) && r.status === 'approved'
            );
            if (approvedReq && (!c.cardApproved || c.creditLimit !== approvedReq.creditLimitApproved)) {
              consumersNeedUpdate = true;
              const updatedConsumer: Consumer = {
                ...c,
                cardApproved: true,
                cardStatus: 'approved' as const,
                creditLimit: approvedReq.creditLimitApproved || c.creditLimit || 50000,
              };
              return updatedConsumer;
            }
            return c;
          });

          if (consumersNeedUpdate) {
            useStore.setState({ consumers: updatedConsumers });
          }

          // Sync consumerSession.consumer with latest consumer
          if (cSession?.consumer) {
            const live = updatedConsumers.find(
              (c: Consumer) => c.id === cSession!.consumer.id || c.mobile === cSession!.consumer.mobile
            );
            if (live && (live.cardApproved !== cSession.consumer.cardApproved || live.creditLimit !== cSession.consumer.creditLimit)) {
              const updatedSession = { ...cSession, consumer: live };
              useStore.setState({ consumerSession: updatedSession });
              localStorage.setItem('akr_consumer_session', JSON.stringify(updatedSession));
            }
          }
        }
      },
      partialize: (state) => ({
        consumers: state.consumers,
        adminUsers: state.adminUsers,
        planTypes: state.planTypes,
        duesPlans: state.duesPlans,
        payments: state.payments,
        cardTypes: state.cardTypes,
        cardRequests: state.cardRequests,
        notifications: state.notifications,
        activityLogs: state.activityLogs,
        consumerSession: state.consumerSession,
        adminSession: state.adminSession,
        simulateNetworkError: state.simulateNetworkError,
      }),
    }
  )
);

// Cross-tab synchronization via storage events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'akr_credit_capital_data_store') {
      try {
        useStore.persist.rehydrate();
      } catch (e) {
        console.warn('Storage sync rehydration warning:', e);
      }
    }
    if (event.key === 'akr_consumer_session') {
      try {
        const raw = localStorage.getItem('akr_consumer_session');
        useStore.getState().setConsumerSession(raw ? JSON.parse(raw) : null);
      } catch (e) {}
    }
    if (event.key === 'akr_admin_session') {
      try {
        const raw = localStorage.getItem('akr_admin_session');
        useStore.getState().setAdminSession(raw ? JSON.parse(raw) : null);
      } catch (e) {}
    }
  });

  // When tab becomes active / focused, rehydrate store to ensure freshness across tabs
  window.addEventListener('focus', () => {
    try {
      useStore.persist.rehydrate();
    } catch (e) {}
  });
}
