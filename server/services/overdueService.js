/**
 * Overdue Calculation Service for AKR Credit Capital Backend
 * Accurately calculates elapsed calendar overdue days and missed weekly EMIs.
 */

function calculatePlanOverdue(plan, refDate = new Date()) {
  const empty = {
    isOverdue: false,
    daysOverdue: 0,
    missedWeeks: 0,
    missedPeriods: 0,
    overdueEmiTotal: 0,
    lateFee: 0,
    mandatoryOverduePayable: 0,
    isCapped: false,
  };

  if (!plan) return empty;

  const rawStatus = plan.status;
  const outstanding = plan.outstandingAmount !== undefined ? Number(plan.outstandingAmount) : 0;
  if (rawStatus === 'closed' || rawStatus === 'completed' || outstanding <= 0) {
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

  // Calculate missed weekly EMIs: 1-7d: 1 wk, 8-14d: 2 wks, 15-21d: 3 wks, 22-28d: 4 wks, etc.
  let calculatedWeeks = 1;
  if (daysOverdue >= 1) {
    calculatedWeeks = Math.ceil(daysOverdue / 7);
  }

  const manualWeeks = Number(plan.missedWeeks) || 0;
  let missedWeeks = Math.max(calculatedWeeks, manualWeeks);

  const remainingEmis = (plan.remainingEmis !== undefined && Number(plan.remainingEmis) > 0)
    ? Number(plan.remainingEmis)
    : (plan.totalEmis !== undefined && Number(plan.totalEmis) > 0 ? Number(plan.totalEmis) : 12);

  const isCapped = missedWeeks >= remainingEmis;
  missedWeeks = Math.min(missedWeeks, remainingEmis);
  if (missedWeeks < 1) missedWeeks = 1;

  const regularEmi = (plan.emiAmount !== undefined && Number(plan.emiAmount) > 0)
    ? Number(plan.emiAmount)
    : outstanding;

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

function enrichPlanWithOverdue(planDoc, refDate = new Date()) {
  if (!planDoc) return null;
  const rawObj = typeof planDoc.toObject === 'function' ? planDoc.toObject() : { ...planDoc };
  const overdueInfo = calculatePlanOverdue(rawObj, refDate);

  return {
    ...rawObj,
    daysOverdue: overdueInfo.daysOverdue,
    missedWeeks: overdueInfo.missedWeeks,
    missedPeriods: overdueInfo.missedWeeks,
    isOverdue: overdueInfo.isOverdue,
    overdueEmiTotal: overdueInfo.overdueEmiTotal,
    mandatoryOverdueAmount: overdueInfo.mandatoryOverduePayable,
  };
}

function calculateDaysOverdue(dateStr, refDate = new Date()) {
  if (!dateStr) return 0;
  const dueDate = new Date(dateStr);
  if (isNaN(dueDate.getTime())) return 0;
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
  const diffMs = refMidnight - dueMidnight;
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

module.exports = {
  calculateDaysOverdue,
  calculatePlanOverdue,
  enrichPlanWithOverdue,
};
