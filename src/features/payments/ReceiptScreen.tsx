import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Receipt screen has been decommissioned as requested.
 * All verified transactions and repayment installments are recorded directly
 * in the Repayment Ledger and Payment History.
 */
export const ReceiptScreen: React.FC = () => {
  return <Navigate to="/app/history" replace />;
};
