import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, IndianRupee, CreditCard, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/app/home',
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: IndianRupee,
      path: '/app/history',
    },
    {
      id: 'cards',
      label: 'Cards',
      icon: CreditCard,
      path: '/app/cards',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/app/profile',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0E0E10]/95 backdrop-blur-md border-t border-akr-border/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      role="navigation"
      aria-label="Consumer Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            location.pathname === tab.path ||
            (tab.id === 'home' && location.pathname === '/app') ||
            (tab.id === 'payments' && location.pathname.startsWith('/app/payment'));

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`
                flex flex-col items-center justify-center py-1.5 px-3 rounded-xl min-w-[64px] min-h-[48px]
                transition-all duration-200 select-none
                ${
                  isActive
                    ? 'text-akr-gold font-semibold scale-105'
                    : 'text-akr-text-muted hover:text-white'
                }
              `}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-akr-gold shadow-gold-glow" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-wider uppercase font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
