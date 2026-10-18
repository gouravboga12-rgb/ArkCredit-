import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoldButton, OutlineGoldButton, StatusBadge, AmountCard, InputField } from '../components/ui';

describe('Design System Components', () => {
  it('renders GoldButton with children and handles clicks', () => {
    const handleClick = vi.fn();
    render(<GoldButton onClick={handleClick}>Pay Now</GoldButton>);

    const button = screen.getByRole('button', { name: /pay now/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders GoldButton in loading state and prevents double click', () => {
    const handleClick = vi.fn();
    render(<GoldButton isLoading onClick={handleClick}>Submit</GoldButton>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders StatusBadge with correct labels and colors', () => {
    render(<StatusBadge status="Due Soon" />);
    expect(screen.getByText('Due Soon')).toBeInTheDocument();

    render(<StatusBadge status="Success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders AmountCard with formatted currency and due date', () => {
    const handlePay = vi.fn();
    render(
      <AmountCard
        totalOutstanding={24850}
        nextEmiAmount={4250}
        nextEmiDate="2026-10-25"
        isDueSoon={true}
        onPayClick={handlePay}
      />
    );

    expect(screen.getByText('₹24,850')).toBeInTheDocument();
    expect(screen.getByText('₹4,250')).toBeInTheDocument();
    expect(screen.getByText(/25 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText('Due Soon')).toBeInTheDocument();

    fireEvent.click(screen.getByText('₹24,850'));
    expect(handlePay).toHaveBeenCalledTimes(1);
  });

  it('renders InputField with label and error state', () => {
    render(
      <InputField
        label="Email or Mobile"
        placeholder="Enter identifier"
        error="Invalid mobile number format"
      />
    );

    expect(screen.getByText('Email or Mobile')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter identifier')).toBeInTheDocument();
    expect(screen.getByText('Invalid mobile number format')).toBeInTheDocument();
  });
});
