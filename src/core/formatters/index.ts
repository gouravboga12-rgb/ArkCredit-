/**
 * Formatters for AKR Credit Capital
 * Zero React/DOM imports - 100% portable to React Native.
 */

/**
 * Format number into Indian currency format (e.g. ₹24,850 or ₹1,50,000)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = Math.round(Number(amount));
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format number without rupee symbol, in Indian numbering format (e.g. "24,850")
 */
export function formatNumberIndian(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0';
  }
  const num = Math.round(Number(amount));
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Mask account number to display format (e.g. "**** **** 4821")
 */
export function maskAccount(accountNumber?: string): string {
  if (!accountNumber) return '**** **** 0000';
  const clean = accountNumber.replace(/\s+/g, '');
  if (clean.length <= 4) {
    return `**** **** ${clean}`;
  }
  const last4 = clean.slice(-4);
  return `**** **** ${last4}`;
}

/**
 * Format date string into human readable Indian format
 * Handles YYYY-MM-DD or ISO timestamps.
 * Returns e.g. "25 Oct 2026" or "12 Oct 2026, 04:30 PM"
 */
export function formatDisplayDate(dateStr?: string, includeTime = false): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    if (!includeTime) {
      return `${day} ${month} ${year}`;
    }

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp into explicit Indian Standard Time (IST) e.g. "18 Oct 2026, 03:30 PM IST"
 */
export function formatDateTimeIST(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
    return `${formatted} IST`;
  } catch {
    return dateStr;
  }
}

/**
 * Extract YYYY-MM-DD in Asia/Kolkata timezone for date-wise grouping & filtering
 */
export function formatDateOnlyIST(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Format month header for transaction grouping (e.g. "October 2026")
 */
export function formatMonthHeader(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}
