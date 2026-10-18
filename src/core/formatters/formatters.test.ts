import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumberIndian,
  maskAccount,
  formatDisplayDate,
  formatMonthHeader,
} from './index';

describe('Formatters', () => {
  it('formats currency in Indian numbering style (e.g. ₹24,850)', () => {
    expect(formatCurrency(24850)).toBe('₹24,850');
    expect(formatCurrency(150000)).toBe('₹1,50,000');
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(null)).toBe('₹0');
  });

  it('formats numbers without rupee symbol', () => {
    expect(formatNumberIndian(24850)).toBe('24,850');
    expect(formatNumberIndian(1000000)).toBe('10,00,000');
  });

  it('masks account number to display last 4 digits (e.g. **** **** 4821)', () => {
    expect(maskAccount('AKR10004821')).toBe('**** **** 4821');
    expect(maskAccount('4821')).toBe('**** **** 4821');
    expect(maskAccount('')).toBe('**** **** 0000');
  });

  it('formats display dates in human-readable Indian format', () => {
    expect(formatDisplayDate('2026-10-25')).toBe('25 Oct 2026');
  });

  it('formats month headers for transaction groupings', () => {
    expect(formatMonthHeader('2026-10-25T14:30:00Z')).toBe('October 2026');
    expect(formatMonthHeader('2026-09-15T10:00:00Z')).toBe('September 2026');
  });
});
