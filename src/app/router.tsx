import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts & Guards
import { ConsumerLayout } from './layouts/ConsumerLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ConsumerRoute, ConsumerPublicOnlyRoute } from './guards/ConsumerRoute';
import { AdminRoute, AdminPublicOnlyRoute } from './guards/AdminRoute';

// Landing Page
import { LandingPage } from './pages/LandingPage';

// Consumer Screens
import { SplashScreen } from '../features/auth/consumer/SplashScreen';
import { LoginScreen } from '../features/auth/consumer/LoginScreen';
import { SignUpScreen } from '../features/auth/consumer/SignUpScreen';
import { ForgotPasswordScreen } from '../features/auth/consumer/ForgotPasswordScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PayDuesScreen } from '../features/payments/PayDuesScreen';
import { PaymentHistoryScreen } from '../features/payments/PaymentHistoryScreen';
import { ReceiptScreen } from '../features/payments/ReceiptScreen';
import { CardsScreen } from '../features/cards/CardsScreen';
import { ConsumerDetailsScreen } from '../features/profile/ConsumerDetailsScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';

// Admin Screens
import { AdminLoginScreen } from '../features/admin/auth/AdminLoginScreen';
import { DashboardScreen } from '../features/admin/dashboard/DashboardScreen';
import { ConsumerManagementScreen } from '../features/admin/consumers/ConsumerManagementScreen';
import { DuesManagementScreen } from '../features/admin/dues/DuesManagementScreen';
import { PlanTypesScreen } from '../features/admin/plan-types/PlanTypesScreen';
import { PaymentsScreen } from '../features/admin/payments/PaymentsScreen';
import { CardManagementScreen } from '../features/admin/cards/CardManagementScreen';
import { CardRequestsScreen } from '../features/admin/card-requests/CardRequestsScreen';
import { AdminNotificationsScreen } from '../features/admin/notifications/AdminNotificationsScreen';
import { ActivityLogScreen } from '../features/admin/activity-log/ActivityLogScreen';

export const router = createBrowserRouter([
  // Direct entry to Consumer App Login (New User Flow)
  {
    path: '/',
    element: <Navigate to="/app/login" replace />,
  },
  {
    path: '/landing',
    element: <LandingPage />,
  },

  // Consumer Public Routes
  {
    path: '/app/splash',
    element: (
      <ConsumerLayout>
        <SplashScreen />
      </ConsumerLayout>
    ),
  },
  {
    path: '/app/login',
    element: (
      <ConsumerPublicOnlyRoute>
        <ConsumerLayout>
          <LoginScreen />
        </ConsumerLayout>
      </ConsumerPublicOnlyRoute>
    ),
  },
  {
    path: '/app/signup',
    element: (
      <ConsumerPublicOnlyRoute>
        <ConsumerLayout>
          <SignUpScreen />
        </ConsumerLayout>
      </ConsumerPublicOnlyRoute>
    ),
  },
  {
    path: '/app/forgot-password',
    element: (
      <ConsumerPublicOnlyRoute>
        <ConsumerLayout>
          <ForgotPasswordScreen />
        </ConsumerLayout>
      </ConsumerPublicOnlyRoute>
    ),
  },

  // Protected Consumer App Routes
  {
    path: '/app',
    element: (
      <ConsumerRoute>
        <ConsumerLayout />
      </ConsumerRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/app/home" replace />,
      },
      {
        path: 'home',
        element: <HomeScreen />,
      },
      {
        path: 'pay',
        element: <PayDuesScreen />,
      },
      {
        path: 'history',
        element: <PaymentHistoryScreen />,
      },
      {
        path: 'receipt/:paymentId',
        element: <ReceiptScreen />,
      },
      {
        path: 'cards',
        element: <CardsScreen />,
      },
      {
        path: 'profile',
        element: <ConsumerDetailsScreen />,
      },
      {
        path: 'notifications',
        element: <NotificationsScreen />,
      },
    ],
  },

  // Admin Public Route
  {
    path: '/admin/login',
    element: (
      <AdminPublicOnlyRoute>
        <AdminLoginScreen />
      </AdminPublicOnlyRoute>
    ),
  },

  // Protected Admin Portal Routes
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardScreen />,
      },
      {
        path: 'consumers',
        element: <ConsumerManagementScreen />,
      },
      {
        path: 'dues',
        element: <DuesManagementScreen />,
      },
      {
        path: 'plan-types',
        element: <PlanTypesScreen />,
      },
      {
        path: 'payments',
        element: <PaymentsScreen />,
      },
      {
        path: 'cards',
        element: <Navigate to="/admin/card-requests" replace />,
      },
      {
        path: 'card-requests',
        element: <CardRequestsScreen />,
      },
      {
        path: 'notifications',
        element: <AdminNotificationsScreen />,
      },
      {
        path: 'activity-log',
        element: (
          <AdminRoute requiredRole="super_admin">
            <ActivityLogScreen />
          </AdminRoute>
        ),
      },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
