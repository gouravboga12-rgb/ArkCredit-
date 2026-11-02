/**
 * Domain rules and financial calculations for AKR Credit Capital
 * 100% Framework-free - reusable in React Native.
 */

import { DuesPlan, DueStatus, PaymentAllocation } from '../types';

/**
 * Calculates a plan's total outstanding: principal + interest + processingFee.
 * Enforces that breakdowns always add up exactly.
 */
export function calculatePlanOutstanding(
  principal: number,
  interest: number,
  processingFee: number
): number {
  return Math.max(0, Math.round((principal || 0) + (interest || 0) + (processingFee || 0)));
}

/**
 * Calculates the total outstanding across all active plans for a consumer.
 */
export function calculateTotalOutstanding(plans: DuesPlan[]): number {
  return plans
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);
}

/**
 * Determines whether a date is within `days` days in the future from a reference date.
 */
export function isWithinDays(targetDateStr: string, days = 7, refDate = new Date()): boolean {
  if (!targetDateStr) return false;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return false;

  // normalize reference date to start of day
  const ref = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffTime = target.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= days;
}

/**
 * Determines whether a date is in the past compared to reference date.
 */
export function isPastDate(targetDateStr: string, refDate = new Date()): boolean {
  if (!targetDateStr) return false;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return false;

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
  return targetMidnight < refMidnight;
}

export interface PlanOverdueInfo {
  isOverdue: boolean;
  daysOverdue: number;
  missedWeeks: number;
  missedPeriods: number;
  overdueEmiTotal: number;
  lateFee: number;
  mandatoryOverduePayable: number;
  isCapped: boolean;
}

/**
 * Accurately calculates overdue metrics based on calendar days elapsed past nextEmiDate.
 * - Compares calendar day of nextEmiDate with refDate (defaults to today).
 * - 1-7 days overdue: 1 week missed
 * - 8-14 days overdue: 2 weeks missed
 * - 15-21 days overdue: 3 weeks missed
 * - 22-28 days overdue: 4 weeks missed (e.g. Oct 5 to Nov 2 = 28 days = 4 weeks missed)
 * - 29+ days overdue: Math.ceil(daysOverdue / 7) weeks missed
 * - Takes Math.max(calculatedWeeks, plan.missedWeeks || 0) so admin manual overrides are respected.
 * - Caps missedWeeks at plan.remainingEmis (cannot owe more than remaining loan tenure).
 * - overdueEmiTotal = min(plan.outstandingAmount, plan.emiAmount * missedWeeks).
 * - mandatoryOverduePayable = min(plan.outstandingAmount + lateFee, overdueEmiTotal + lateFee).
 */
export function calculatePlanOverdue(
  plan: Partial<DuesPlan> | null | undefined,
  refDate: Date = new Date()
): PlanOverdueInfo {
  const empty: PlanOverdueInfo = {
    isOverdue: false,
    daysOverdue: 0,
    missedWeeks: 0,
    missedPeriods: 0,
    overdueEmiTotal: 0,
    lateFee: 0,
    mandatoryOverduePayable: 0,
    isCapped: false,
  };

  if (!plan || plan.status === 'closed' || (plan.outstandingAmount !== undefined && plan.outstandingAmount <= 0)) {
    return empty;
  }

  const lateFee = Math.max(0, Number(plan.overdueAmount) || 0);
  let daysOverdue = 0;
  let isPastDue = false;

  if (plan.nextEmiDate) {
    const dueDate = new Date(plan.nextEmiDate);
    if (!isNaN(dueDate.getTime())) {
      const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
      const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
      const diffMs = refMidnight - dueMidnight;
      if (diffMs > 0) {
        daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        isPastDue = daysOverdue >= 1;
      }
    }
  }

  const isOverdue = isPastDue || lateFee > 0;
  if (!isOverdue) {
    return empty;
  }

  let calculatedWeeks = 1;
  if (daysOverdue >= 1) {
    calculatedWeeks = Math.ceil(daysOverdue / 7);
  }

  const manualWeeks = Number(plan.missedWeeks) || 0;
  let missedWeeks = Math.max(calculatedWeeks, manualWeeks);

  const remainingEmis = (plan.remainingEmis !== undefined && plan.remainingEmis > 0)
    ? plan.remainingEmis
    : (plan.totalEmis !== undefined && plan.totalEmis > 0 ? plan.totalEmis : 12);

  const isCapped = missedWeeks >= remainingEmis;
  missedWeeks = Math.min(missedWeeks, remainingEmis);
  if (missedWeeks < 1) missedWeeks = 1;

  const outstanding = plan.outstandingAmount !== undefined ? plan.outstandingAmount : 0;
  const regularEmi = (plan.emiAmount !== undefined && plan.emiAmount > 0) ? plan.emiAmount : outstanding;
  const overdueEmiTotal = outstanding > 0 ? Math.min(outstanding, regularEmi * missedWeeks) : regularEmi * missedWeeks;
  const mandatoryOverduePayable = outstanding > 0
    ? Math.min(outstanding + lateFee, overdueEmiTotal + lateFee)
    : overdueEmiTotal + lateFee;

  return {
    isOverdue: true,
    daysOverdue,
    missedWeeks,
    missedPeriods: missedWeeks,
    overdueEmiTotal,
    lateFee,
    mandatoryOverduePayable,
    isCapped,
  };
}

/**
 * Determines the status for a dues plan or consumer:
 * - 'Overdue' if next EMI date is in the past and outstanding > 0
 * - 'Due Soon' if next EMI is within 7 days and outstanding > 0
 * - 'Clear' if outstanding <= 0 or no active dues
 * - 'Inactive' if explicitly marked inactive
 */
export function determineDueStatus(
  plans: DuesPlan[],
  isConsumerActive = true,
  refDate = new Date()
): DueStatus {
  if (!isConsumerActive) return 'Inactive';

  const activePlans = plans.filter((p) => p.status === 'active' && p.outstandingAmount > 0);
  if (activePlans.length === 0) return 'Clear';

  const hasOverdue = activePlans.some(
    (p) => calculatePlanOverdue(p, refDate).isOverdue
  );
  if (hasOverdue) return 'Overdue';

  const hasDueSoon = activePlans.some((p) => isWithinDays(p.nextEmiDate, 7, refDate));
  if (hasDueSoon) return 'Due Soon';

  return 'Clear';
}

/**
 * Finds the earliest upcoming EMI details among active plans:
 * Combines EMI amounts if multiple plans are due on the same earliest date.
 */
export function getEarliestNextEmi(plans: DuesPlan[], refDate = new Date()): {
  amount: number;
  overdueEmiTotal: number;
  dueDate: string;
  isDueSoon: boolean;
  isOverdue: boolean;
  planCount: number;
} {
  const activePlansWithEmi = plans.filter(
    (p) => p.status === 'active' && p.outstandingAmount > 0 && p.emiAmount > 0 && p.nextEmiDate
  );

  if (activePlansWithEmi.length === 0) {
    return {
      amount: 0,
      overdueEmiTotal: 0,
      dueDate: '',
      isDueSoon: false,
      isOverdue: false,
      planCount: 0,
    };
  }

  // Sort by earliest nextEmiDate
  const sorted = [...activePlansWithEmi].sort(
    (a, b) => new Date(a.nextEmiDate).getTime() - new Date(b.nextEmiDate).getTime()
  );

  const earliestDate = sorted[0].nextEmiDate;
  const plansOnEarliestDate = sorted.filter((p) => p.nextEmiDate === earliestDate);
  const combinedAmount = plansOnEarliestDate.reduce((sum, p) => sum + p.emiAmount, 0);
  const overdueEmiTotal = plansOnEarliestDate.reduce((sum, p) => {
    const overdue = calculatePlanOverdue(p, refDate);
    return sum + (overdue.isOverdue ? overdue.overdueEmiTotal : 0);
  }, 0);

  const isEarliestOverdue = plansOnEarliestDate.some((p) => calculatePlanOverdue(p, refDate).isOverdue);

  return {
    amount: combinedAmount,
    overdueEmiTotal,
    dueDate: earliestDate,
    isDueSoon: !isEarliestOverdue && isWithinDays(earliestDate, 7, refDate),
    isOverdue: isEarliestOverdue,
    planCount: plansOnEarliestDate.length,
  };
}

/**
 * Advances a date by 1 month (handles month rollover gracefully).
 */
export function advanceDateByOneMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const currentDay = d.getDate();
  d.setMonth(d.getMonth() + 1);

  // If day rolled over (e.g. Feb 30 -> Mar 2), set to last day of intended month
  if (d.getDate() !== currentDay) {
    d.setDate(0);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Advances a date by N weeks (7 days per week).
 */
export function advanceDateByWeeks(dateStr: string, weeks = 1): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  d.setDate(d.getDate() + weeks * 7);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Allocates a "Pay All" amount across active plans:
 * Priority: Earliest next EMI date first, then largest outstanding.
 */
export function allocatePayAllAmount(
  totalAmount: number,
  plans: DuesPlan[]
): PaymentAllocation[] {
  const activePlans = plans
    .filter((p) => p.status === 'active' && p.outstandingAmount > 0)
    .sort((a, b) => {
      const dateA = new Date(a.nextEmiDate).getTime();
      const dateB = new Date(b.nextEmiDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return b.outstandingAmount - a.outstandingAmount;
    });

  let remainingToAllocate = Math.max(0, Math.round(totalAmount));
  const allocations: PaymentAllocation[] = [];

  for (const plan of activePlans) {
    if (remainingToAllocate <= 0) {
      allocations.push({
        planId: plan.id,
        planTitle: plan.title,
        allocatedAmount: 0,
        remainingBalanceAfter: plan.outstandingAmount,
      });
      continue;
    }

    const alloc = Math.min(plan.outstandingAmount, remainingToAllocate);
    remainingToAllocate -= alloc;

    allocations.push({
      planId: plan.id,
      planTitle: plan.title,
      allocatedAmount: alloc,
      remainingBalanceAfter: plan.outstandingAmount - alloc,
    });
  }

  return allocations;
}

/**
 * Applies a payment to a plan:
 * Returns the updated plan.
 * - Reduces outstandingAmount by paymentAmount (and adjusts principal proportionally)
 * - Decrements remainingEmis if it was an EMI payment
 * - Advances nextEmiDate by 1 week (or N weeks if overdue) if remainingEmis > 0
 * - Closes plan if outstanding reaches 0
 */
export function applyPaymentToPlan(
  plan: DuesPlan,
  paymentAmount: number,
  isEmiPayment = false
): DuesPlan {
  const actualPay = Math.min(plan.outstandingAmount, Math.max(0, paymentAmount));
  const newOutstanding = Math.max(0, plan.outstandingAmount - actualPay);

  // Proportionally reduce principal and interest
  const ratio = plan.outstandingAmount > 0 ? (newOutstanding / plan.outstandingAmount) : 0;
  const newPrincipal = Math.round(plan.principal * ratio);
  const newInterest = Math.round(plan.interest * ratio);
  const newFee = Math.max(0, newOutstanding - newPrincipal - newInterest);

  let newRemainingEmis = plan.remainingEmis;
  let newNextEmiDate = plan.nextEmiDate;

  if (isEmiPayment || actualPay >= plan.emiAmount) {
    const regularEmi = plan.emiAmount > 0 ? plan.emiAmount : 1;
    const weeksPaid = Math.max(1, Math.min(plan.remainingEmis, Math.floor(actualPay / regularEmi)));
    newRemainingEmis = Math.max(0, plan.remainingEmis - weeksPaid);
    if (newRemainingEmis > 0 && newOutstanding > 0) {
      newNextEmiDate =
        plan.frequency === 'monthly'
          ? advanceDateByOneMonth(plan.nextEmiDate)
          : advanceDateByWeeks(plan.nextEmiDate, weeksPaid);
    }
  }

  return {
    ...plan,
    outstandingAmount: newOutstanding,
    principal: newPrincipal,
    interest: newInterest,
    processingFee: newFee,
    remainingEmis: newRemainingEmis,
    nextEmiDate: newNextEmiDate,
    overdueAmount: 0,
    missedWeeks: 0,
    missedMonths: 0,
    overdueRemarks: undefined,
    status: newOutstanding === 0 ? 'closed' : 'active',
    updatedAt: new Date().toISOString(),
  };
}
