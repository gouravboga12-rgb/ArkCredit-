import React, { useState, useEffect } from 'react';
import { RefreshCw, Smartphone, Monitor, AlertTriangle, ShieldCheck, UserCheck, X } from 'lucide-react';
import { useStore } from '../../store';

export const DevToolbar: React.FC = () => {
  const showToolbar = (import.meta as any).env?.VITE_DEMO_TOOLBAR === 'true' || true;
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [pathname, setPathname] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : ''));

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    setIsOpen(false);
    window.location.href = path;
  };

  const resetDemoData = useStore((state) => state.resetDemoData);
  const simulateNetworkError = useStore((state) => state.simulateNetworkError);
  const setSimulateNetworkError = useStore((state) => state.setSimulateNetworkError);

  if (!showToolbar) return null;

  const handleReset = () => {
    if (window.confirm('Reset all demo data to default initial state?')) {
      setIsResetting(true);
      resetDemoData();
      setTimeout(() => {
        setIsResetting(false);
        window.location.reload();
      }, 300);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 select-none">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 text-akr-gold border border-akr-gold/40 shadow-2xl backdrop-blur-md text-xs font-semibold hover:border-akr-gold hover:scale-105 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-akr-gold animate-ping" />
          <span>Demo Toolbar</span>
        </button>
      ) : (
        <div className="bg-[#121214] border border-akr-gold/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs text-zinc-200 max-w-sm animate-scaleUp">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
            <span className="font-bold text-akr-gold flex items-center gap-1.5">
              <span>⚡</span> Demo & QA Controls
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Quick Route Switches (Never auto-logs in across types) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigateTo('/app/login')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-semibold transition-colors ${
                  pathname.startsWith('/app')
                    ? 'bg-akr-gold/15 border-akr-gold text-akr-gold'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Consumer App</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('/admin/login')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-semibold transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-akr-gold/15 border-akr-gold text-akr-gold'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </button>
            </div>

            {/* Network Error Simulator */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-[11px] flex items-center gap-1.5 text-zinc-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Simulate Network Error
              </span>
              <input
                type="checkbox"
                checked={simulateNetworkError}
                onChange={(e) => setSimulateNetworkError(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Reset Demo Data Button */}
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/60 font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset All Demo Data</span>
            </button>

            {/* Quick Demo Credentials Reminder */}
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/70 text-[10px] space-y-1 text-zinc-400 font-mono">
              <div className="text-akr-gold font-bold">Demo Logins:</div>
              <div>Consumer: rahul@example.com / Demo@123</div>
              <div>Admin: admin@akr.com / Admin@123</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
