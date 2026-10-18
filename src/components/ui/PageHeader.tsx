import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={`
        sticky top-0 z-30 bg-[#0B0B0C]/90 backdrop-blur-md px-4 py-3.5 border-b border-akr-border/40
        flex items-center justify-between
        ${className}
      `}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-akr-surface border border-akr-border text-white hover:text-akr-gold hover:border-akr-gold/50 flex items-center justify-center transition-colors active:scale-95"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base font-bold text-white tracking-wide font-sans">{title}</h1>
          {subtitle && <p className="text-xs text-akr-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {rightAction && <div className="flex items-center">{rightAction}</div>}
    </div>
  );
};
