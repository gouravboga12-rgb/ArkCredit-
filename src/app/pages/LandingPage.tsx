import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Monitor, Shield, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { AkrLogo } from '../../assets/logo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col justify-between selection:bg-akr-gold selection:text-black">
      {/* Top Header */}
      <header className="px-6 py-6 border-b border-akr-border/50 max-w-6xl w-full mx-auto flex items-center justify-between">
        <AkrLogo size="md" variant="image" />
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-akr-gold/15 text-akr-gold border border-akr-gold/30 font-semibold tracking-wider uppercase">
            Interactive Prototype v1.0
          </span>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-akr-gold/30 text-akr-gold-light text-xs font-medium mb-6 shadow-gold-glow">
          <SparklesIcon className="w-4 h-4 text-akr-gold" />
          <span>Built by CODTECH Private Limited for AKR Credit Capital</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Consumer Dues & EMI Management Platform
        </h1>

        <p className="mt-4 text-base md:text-lg text-akr-text-muted max-w-2xl leading-relaxed">
          A mobile-first consumer experience backed by real-time business administration.
          Inspect dues, settle EMIs with instant allocation, browse credit cards, and maintain portfolio balances.
        </p>

        {/* Two Portals CTA Cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Consumer App Portal Card */}
          <div
            onClick={() => navigate('/app/login')}
            className="
              group p-6 rounded-2xl bg-gradient-to-b from-[#18181A] to-[#101012]
              border border-akr-gold/40 hover:border-akr-gold shadow-2xl cursor-pointer
              transition-all duration-300 hover:-translate-y-1 hover:shadow-gold-glow
              flex flex-col justify-between text-left
            "
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-akr-gold/15 text-akr-gold border border-akr-gold/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-akr-gold-light transition-colors">
                Open Consumer App
              </h3>
              <p className="text-xs text-akr-text-muted leading-relaxed mb-4">
                Mobile-first Android prototype replicating the 5-phone mockup. Login as <strong>Rahul Sharma</strong>, review ₹24,850 dues across 3 plans, and simulate EMI payment.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-akr-gold">
              <span>Launch Consumer Experience</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Admin Panel Portal Card */}
          <div
            onClick={() => navigate('/admin/login')}
            className="
              group p-6 rounded-2xl bg-gradient-to-b from-[#18181A] to-[#101012]
              border border-zinc-700/80 hover:border-akr-gold shadow-2xl cursor-pointer
              transition-all duration-300 hover:-translate-y-1 hover:shadow-gold-glow
              flex flex-col justify-between text-left
            "
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:text-akr-gold group-hover:border-akr-gold/40">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-2 group-hover:text-akr-gold-light transition-colors">
                Open Admin Panel
              </h3>
              <p className="text-xs text-akr-text-muted leading-relaxed mb-4">
                Responsive business portal with role-based access. Manage 25+ consumers, add custom dues plans, perform bulk CSV uploads, and record offline payments.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-akr-gold">
              <span>Launch Business Panel</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Demo Credentials & Notes Box */}
        <div className="mt-10 p-5 rounded-xl bg-[#121215] border border-zinc-800 max-w-2xl w-full text-left text-xs text-zinc-400">
          <div className="flex items-center gap-2 font-bold text-white mb-2">
            <Shield className="w-4 h-4 text-akr-gold" />
            <span>Strict Route Separation & Architecture Notes:</span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
            <li>
              <strong>Consumer credentials:</strong> <span className="font-mono text-akr-gold">rahul@example.com</span> / <span className="font-mono text-akr-gold">Demo@123</span> (works <em>only</em> on /app/login).
            </li>
            <li>
              <strong>Super Admin credentials:</strong> <span className="font-mono text-akr-gold">admin@akr.com</span> / <span className="font-mono text-akr-gold">Admin@123</span> (works <em>only</em> on /admin/login).
            </li>
            <li>
              <strong>Staff Admin credentials:</strong> <span className="font-mono text-akr-gold">staff@akr.com</span> / <span className="font-mono text-akr-gold">Staff@123</span> (works <em>only</em> on /admin/login).
            </li>
            <li>
              Shared Zustand storage intercepts real <span className="font-mono text-zinc-300">fetch()</span> calls via MSW: updates made in Admin reflect instantly in Consumer App, and vice versa!
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-zinc-800/60 text-center text-xs text-zinc-500">
        <p>© 2026 AKR Credit Capital. Building Possibilities Together. Built by CODTECH Private Limited.</p>
      </footer>
    </div>
  );
};

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
