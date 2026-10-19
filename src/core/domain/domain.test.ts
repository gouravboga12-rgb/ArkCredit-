import { describe, it, expect } from 'vitest';
import {
  calculatePlanOutstanding,
  calculateTotalOutstanding,
  isWithinDays,
  isPastDate,
  determineDueStatus,
  getEarliestNextEmi,
  advanceDateByOneMonth,
  allocatePayAllAmount,
  applyPaymentToPlan,
} from './index';
import { DuesPlan } from '../types';

describe('Financial Domain Calculations & Business Rules', () => {
  it('enforces plan breakdown arithmetic: outstanding = principal + interest + processingFee', () => {
    // Rahul's Personal Loan: 13,500 + 3,000 + 500 = 17,000
    expect(calculatePlanOutstanding(13500, 3000, 500)).toBe(17000);
    // Rahul's Gold Card EMI: 5,350 + 1,000 + 0 = 6,350
    expect(calculatePlanOutstanding(5350, 1000, 0)).toBe(6350);
    // Breakdowns must never return negative amounts
    expect(calculatePlanOutstanding(-100, 0, 0)).toBe(0);
  });

  it('calculates consumer total outstanding as sum of active plans only', () => {
    const plans: DuesPlan[] = [
      {
        id: '1',
        consumerId: 'c1',
        planTypeId: 'pt1',
        title: 'Loan EMI',
        referenceNumber: 'REF1',
        status: 'active',
        outstandingAmount: 17000,
        totalPaymentDue: 45000,
        principal: 13500,
        interest: 3000,
        processingFee: 500,
        emiAmount: 2750,
        nextEmiDate: '2026-10-25',
        totalEmis: 36,
        remainingEmis: 18,
        tenureMonths: 36,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: '2',
        consumerId: 'c1',
        planTypeId: 'pt2',
        title: 'Card EMI',
        referenceNumber: 'REF2',
        status: 'active',
        outstandingAmount: 6350,
        totalPaymentDue: 9000,
        principal: 5350,
        interest: 1000,
        processingFee: 0,
        emiAmount: 1500,
        nextEmiDate: '2026-10-25',
        totalEmis: 6,
        remainingEmis: 4,
        tenureMonths: 6,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: '3',
        consumerId: 'c1',
        planTypeId: 'pt3',
        title: 'Other Dues',
        referenceNumber: 'REF3',
        status: 'active',
        outstandingAmount: 1500,
        totalPaymentDue: 1500,
        principal: 1500,
        interest: 0,
        processingFee: 0,
        emiAmount: 0,
        nextEmiDate: '2026-10-25',
        totalEmis: 0,
        remainingEmis: 0,
        tenureMonths: 0,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: '4',
        consumerId: 'c1',
        planTypeId: 'pt4',
        title: 'Closed Old Loan',
        referenceNumber: 'REF4',
        status: 'closed',
        outstandingAmount: 0,
        totalPaymentDue: 20000,
        principal: 0,
        interest: 0,
        processingFee: 0,
        emiAmount: 2000,
        nextEmiDate: '2026-05-15',
        totalEmis: 10,
        remainingEmis: 0,
        tenureMonths: 10,
        createdAt: '2025-01-01',
        updatedAt: '2026-05-15',
      },
    ];

    // 17,000 + 6,350 + 1,500 = 24,850 (closed plan ignored)
    expect(calculateTotalOutstanding(plans)).toBe(24850);
  });

  it('correctly identifies earliest next EMI and combines amounts on same earliest due date', () => {
    const plans: DuesPlan[] = [
      {
        id: '1',
        consumerId: 'c1',
        planTypeId: 'pt1',
        title: 'Loan EMI',
        referenceNumber: 'REF1',
        status: 'active',
        outstandingAmount: 17000,
        totalPaymentDue: 45000,
        principal: 13500,
        interest: 3000,
        processingFee: 500,
        emiAmount: 2750,
        nextEmiDate: '2026-10-25',
        totalEmis: 36,
        remainingEmis: 18,
        tenureMonths: 36,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: '2',
        consumerId: 'c1',
        planTypeId: 'pt2',
        title: 'Card EMI',
        referenceNumber: 'REF2',
        status: 'active',
        outstandingAmount: 6350,
        totalPaymentDue: 9000,
        principal: 5350,
        interest: 1000,
        processingFee: 0,
        emiAmount: 1500,
        nextEmiDate: '2026-10-25',
        totalEmis: 6,
        remainingEmis: 4,
        tenureMonths: 6,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const nextEmi = getEarliestNextEmi(plans);
    // Combined EMI: 2,750 + 1,500 = 4,250 on 2026-10-25
    expect(nextEmi.amount).toBe(4250);
    expect(nextEmi.dueDate).toBe('2026-10-25');
    expect(nextEmi.planCount).toBe(2);
  });

  it('advances next EMI date accurately by 1 month', () => {
    expect(advanceDateByOneMonth('2026-10-25')).toBe('2026-11-25');
    expect(advanceDateByOneMonth('2026-12-15')).toBe('2027-01-15');
    // Month rollover (Jan 31 -> Feb 28)
    expect(advanceDateByOneMonth('2026-01-31')).toBe('2026-02-28');
  });

  it('allocates Pay All amount across plans earliest due date first', () => {
    const plans: DuesPlan[] = [
      {
        id: 'p1',
        consumerId: 'c1',
        planTypeId: 'pt1',
        title: 'Loan EMI (Due Earlier)',
        referenceNumber: 'REF1',
        status: 'active',
        outstandingAmount: 5000,
        totalPaymentDue: 10000,
        principal: 4500,
        interest: 500,
        processingFee: 0,
        emiAmount: 2500,
        nextEmiDate: '2026-10-20',
        totalEmis: 4,
        remainingEmis: 2,
        tenureMonths: 4,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'p2',
        consumerId: 'c1',
        planTypeId: 'pt2',
        title: 'Card EMI (Due Later)',
        referenceNumber: 'REF2',
        status: 'active',
        outstandingAmount: 8000,
        totalPaymentDue: 8000,
        principal: 7500,
        interest: 500,
        processingFee: 0,
        emiAmount: 2000,
        nextEmiDate: '2026-10-28',
        totalEmis: 4,
        remainingEmis: 4,
        tenureMonths: 4,
        createdAt: '',
        updatedAt: '',
      },
    ];

    // Pay ₹7,000 across plans:
    // First plan takes ₹5,000 (clearing it to 0)
    // Second plan takes remaining ₹2,000 (leaving ₹6,000)
    const alloc = allocatePayAllAmount(7000, plans);
    expect(alloc).toHaveLength(2);
    expect(alloc[0].planId).toBe('p1');
    expect(alloc[0].allocatedAmount).toBe(5000);
    expect(alloc[0].remainingBalanceAfter).toBe(0);

    expect(alloc[1].planId).toBe('p2');
    expect(alloc[1].allocatedAmount).toBe(2000);
    expect(alloc[1].remainingBalanceAfter).toBe(6000);
  });

  it('applies payment to plan: reduces outstanding, decrements remaining EMIs, advances date, and closes when 0', () => {
    const plan: DuesPlan = {
      id: 'plan_test',
      consumerId: 'c1',
      planTypeId: 'pt1',
      title: 'Bridal Silk Saree EMI',
      referenceNumber: 'REF_TEST',
      status: 'active',
      outstandingAmount: 6000,
      totalPaymentDue: 12000,
      principal: 6000,
      interest: 0,
      processingFee: 0,
      emiAmount: 2000,
      nextEmiDate: '2026-10-25',
      frequency: 'weekly',
      totalEmis: 6,
      remainingEmis: 3,
      tenureWeeks: 6,
      createdAt: '',
      updatedAt: '',
    };

    // 1. Partial EMI payment of ₹2,000 (advances by 1 week: 2026-10-25 + 7d = 2026-11-01)
    const after1 = applyPaymentToPlan(plan, 2000, true);
    expect(after1.outstandingAmount).toBe(4000);
    expect(after1.remainingEmis).toBe(2);
    expect(after1.nextEmiDate).toBe('2026-11-01');
    expect(after1.status).toBe('active');

    // 2. Full remaining payment of ₹4,000 -> Closes plan
    const after2 = applyPaymentToPlan(after1, 4000, true);
    expect(after2.outstandingAmount).toBe(0);
    expect(after2.status).toBe('closed');
  });

  it('determines due status correctly: Overdue, Due Soon, Clear, Inactive', () => {
    const refDate = new Date('2026-10-18');

    const overduePlan: DuesPlan = {
      id: '1',
      consumerId: 'c1',
      planTypeId: 'pt1',
      title: 'Late Plan',
      referenceNumber: 'REF_LATE',
      status: 'active',
      outstandingAmount: 5000,
      totalPaymentDue: 5000,
      principal: 5000,
      interest: 0,
      processingFee: 0,
      emiAmount: 2500,
      nextEmiDate: '2026-10-10', // 8 days in past
      totalEmis: 2,
      remainingEmis: 2,
      tenureMonths: 2,
      createdAt: '',
      updatedAt: '',
    };

    const dueSoonPlan: DuesPlan = {
      ...overduePlan,
      nextEmiDate: '2026-10-22', // 4 days in future
    };

    expect(determineDueStatus([overduePlan], true, refDate)).toBe('Overdue');
    expect(determineDueStatus([dueSoonPlan], true, refDate)).toBe('Due Soon');
    expect(determineDueStatus([], true, refDate)).toBe('Clear');
    expect(determineDueStatus([dueSoonPlan], false, refDate)).toBe('Inactive');

    // Overdue late fee penalty assigned by Admin also marks status as Overdue
    const planWithLateFee: DuesPlan = {
      ...dueSoonPlan,
      overdueAmount: 250,
      missedMonths: 1,
    };
    expect(determineDueStatus([planWithLateFee], true, refDate)).toBe('Overdue');
  });
});
