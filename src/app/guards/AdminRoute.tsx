import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { AdminRole } from '../../core/types';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredRole?: AdminRole;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children, requiredRole }) => {
  const adminSession = useStore((state) => state.adminSession);
  const location = useLocation();

  // If no admin session exists, redirect strictly to admin login (never consumer login)
  if (!adminSession || adminSession.userType !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && requiredRole === 'super_admin' && adminSession.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-akr-bg text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-akr-danger/20 text-akr-danger flex items-center justify-center mb-4 text-2xl font-bold">
          !
        </div>
        <h1 className="text-2xl font-serif font-bold text-white mb-2">Access Denied</h1>
        <p className="text-akr-text-muted max-w-md mb-6 text-sm">
          This section requires Super Admin privileges. Your current role is <strong>Staff</strong>.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 rounded-button bg-akr-surface border border-akr-border text-white hover:border-akr-gold transition-colors text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export const AdminPublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminSession = useStore((state) => state.adminSession);

  // If already logged in as admin, redirect to admin dashboard
  if (adminSession && adminSession.userType === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};
