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

  // Selected quick nav items for mobile/tablet bottom bar
  const quickNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Consumers', path: '/admin/consumers', icon: Users },
    { label: 'Dues', path: '/admin/dues', icon: IndianRupee },
    { label: 'Requests', path: '/admin/card-requests', icon: FileText, badge: pendingRequestsCount },
  ];

  const currentNav = navItems.find((n) => location.pathname === n.path);

  return (
    <div className="min-h-screen bg-[#0F0F11] text-zinc-100 flex flex-col lg:flex-row antialiased">
      {/* Mobile & Tablet Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#141417] border-b border-akr-border/80 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <AkrLogo size="sm" variant="image" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide">
              AKR Admin
            </span>
            <span className="text-[10px] text-akr-gold font-semibold uppercase tracking-wider">
              {currentNav?.label || 'Portal'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingRequestsCount > 0 && (
            <button
              onClick={() => navigate('/admin/card-requests')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold"
              title={`${pendingRequestsCount} Pending Card Requests`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{pendingRequestsCount}</span>
            </button>
          )}

          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white hover:border-akr-gold transition-colors flex items-center gap-1.5"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] font-bold hidden sm:inline">Menu</span>
          </button>
        </div>
      </header>

      {/* Desktop Sidebar & Mobile/Tablet Slide-over Drawer */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-72 lg:w-64 bg-[#141416] border-r border-akr-border/80
          flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
          ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Branding & Mobile Close Button */}
          <div className="p-4 lg:p-5 border-b border-akr-border/60 flex items-center justify-between">
            <div className="flex-1">
              <AkrLogo size="md" variant="image" />
              <div className="mt-2 text-center lg:text-left">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-akr-gold/15 text-akr-gold border border-akr-gold/30">
                  Business Control Panel
                </span>
              </div>
            </div>

            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
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

          {/* Switch to Consumer App & User Card */}
          <div className="p-4 border-t border-akr-border/60 bg-[#111113] space-y-3">
            <button
              onClick={() => {
                setMobileDrawerOpen(false);
                navigate('/app/home');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 transition-colors"
            >
              <span>📱 Switch to Consumer App</span>
            </button>

            <div className="flex items-center gap-3">
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
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 min-w-0 bg-[#0F0F11] overflow-y-auto pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile & Tablet Bottom Quick Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121215]/95 backdrop-blur-md border-t border-akr-border/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {quickNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                isActive ? 'text-akr-gold font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] font-extrabold bg-amber-500 text-black">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Button */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-zinc-400 hover:text-white transition-all"
        >
          <Menu className="w-5 h-5 stroke-2" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}
    </div>
  );
};
