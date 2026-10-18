import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store';
import { AkrLogo } from '../../../assets/logo';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const consumerSession = useStore((state) => state.consumerSession);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (consumerSession && consumerSession.userType === 'consumer') {
        navigate('/app/home', { replace: true });
      } else {
        navigate('/app/login', { replace: true });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [consumerSession, navigate]);

  return (
    <div className="flex-1 min-h-full bg-akr-bg flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Ambient background gold glow */}
      <div className="absolute w-72 h-72 rounded-full bg-akr-gold/10 blur-[100px] pointer-events-none animate-pulse" />

      {/* Center Brand Logo with shimmer */}
      <div className="relative z-10 flex flex-col items-center animate-scaleUp">
        <AkrLogo size="xl" variant="image" />
        <div className="mt-8 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-akr-gold animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-akr-gold animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-akr-gold animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      <div className="absolute bottom-10 text-center text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
        Secured Financial Infrastructure
      </div>
    </div>
  );
};
