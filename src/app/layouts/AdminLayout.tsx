import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  Layers,
  History,
  CreditCard,
  FileText,
  Bell,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import { useStore } from '../../store';
import { adminAuthService } from '../../services/adminAuthService';
import { AkrLogo } from '../../assets/logo';

export const AdminLayout: React.FC = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const adminSession = useStore((state) => state.adminSession);
  const cardRequests = useStore((state) => state.cardRequests || []);
  const pendingRequestsCount = cardRequests.filter((r) => r.status === 'pending').length;

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    adminAuthService.logout();
    navigate('/admin/login');
  };

  const isSuperAdmin = adminSession?.role === 'super_admin';

  const navItems = [
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      superOnly: false,
    },
    {
      label: 'Consumers',
      path: '/admin/consumers',
      icon: Users,
      superOnly: false,
    },
    {
      label: 'Dues & EMI Updates',
      path: '/admin/dues',
      icon: IndianRupee,
      superOnly: false,
    },
    {
      label: 'EMI & Dues Types',
      path: '/admin/plan-types',
      icon: Layers,
      superOnly: false,
    },
    {
      label: 'Payments',
      path: '/admin/payments',
      icon: History,
      superOnly: false,
    },
    {
      label: 'Card Types',
      path: '/admin/cards',
      icon: CreditCard,
      superOnly: false,
    },
    {
      label: 'Card Requests',
      path: '/admin/card-requests',
      icon: FileText,
      superOnly: false,
      badge: pendingRequestsCount,
    },
    {
      label: 'Notifications',
      path: '/admin/notifications',
      icon: Bell,
      superOnly: false,
    },
    {
      label: 'Activity Log',
      path: '/admin/activity-log',
      icon: ShieldCheck,
      superOnly: true, // Super admin exclusive
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F11] text-zinc-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-akr-surface border-b border-akr-border/80 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <AkrLogo size="sm" variant="image" />
          <span className="text-xs font-bold text-akr-gold uppercase tracking-wider">
            Admin Portal
          </span>
        </div>
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="p-2 rounded-lg bg-akr-bg border border-akr-border text-white"
          aria-label="Toggle Navigation"
        >
          {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar & Mobile Drawer */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-64 bg-[#141416] border-r border-akr-border/80
          flex flex-col justify-between transition-transform duration-300 ease-in-out
          ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          {/* Logo Branding */}
          <div className="p-5 border-b border-akr-border/60">
            <AkrLogo size="md" variant="image" />
            <div className="mt-2 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-akr-gold/15 text-akr-gold border border-akr-gold/30">
                Business Control Panel
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {navItems.map((item) => {
              // Hide Super Admin items from Staff
              if (item.superOnly && !isSuperAdmin) return null;

              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`
                    flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold
                    transition-all duration-200 select-none
                    ${
                      isActive
                        ? 'bg-akr-gold text-black shadow-gold-glow font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-black text-akr-gold'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-akr-border/60 bg-[#111113]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-akr-gold/20 text-akr-gold border border-akr-gold/40 flex items-center justify-center font-bold text-sm">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {adminSession?.admin.name || 'Admin User'}
              </p>
              <span
                className={`
                  inline-block text-[9px] uppercase font-semibold px-2 py-0.2 rounded-full mt-0.5
                  ${
                    isSuperAdmin
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                      : 'bg-zinc-800 text-zinc-300'
                  }
                `}
              >
                {isSuperAdmin ? 'Super Admin' : 'Staff Admin'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 min-w-0 bg-[#0F0F11] overflow-y-auto">
        <Outlet />
      </main>

      {/* Backdrop for mobile drawer */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}
    </div>
  );
};
