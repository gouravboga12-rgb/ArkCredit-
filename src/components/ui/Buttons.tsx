import React from 'react';
import { Loader2 } from 'lucide-react';

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const GoldButton: React.FC<GoldButtonProps> = ({
  children,
  isLoading = false,
  fullWidth = true,
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'py-2 px-4 text-xs min-h-[38px]',
    md: 'py-3.5 px-6 text-sm min-h-[48px]',
    lg: 'py-4 px-8 text-base min-h-[54px]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        relative inline-flex items-center justify-center font-semibold rounded-button
        bg-gold-gradient text-black tracking-wide shadow-gold-glow
        transition-all duration-300 ease-out active:scale-[0.98]
        hover:brightness-105 hover:shadow-gold-glow-lg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none
        ${fullWidth ? 'w-full' : ''}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </span>
      )}
    </button>
  );
};

export const OutlineGoldButton: React.FC<GoldButtonProps> = ({
  children,
  isLoading = false,
  fullWidth = true,
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'py-2 px-4 text-xs min-h-[38px]',
    md: 'py-3.5 px-6 text-sm min-h-[48px]',
    lg: 'py-4 px-8 text-base min-h-[54px]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        relative inline-flex items-center justify-center font-semibold rounded-button
        border border-akr-gold text-akr-gold bg-transparent
        transition-all duration-300 ease-out active:scale-[0.98]
        hover:bg-akr-gold/10 hover:border-akr-gold-light hover:text-akr-gold-light
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${fullWidth ? 'w-full' : ''}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-akr-gold" />
      ) : (
        <span className="flex items-center gap-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </span>
      )}
    </button>
  );
};

export const GoogleButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children = 'Continue with Google',
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      className={`
        w-full py-3.5 px-6 min-h-[48px] rounded-button font-medium text-sm
        bg-white text-gray-800 border border-gray-300
        flex items-center justify-center gap-3 shadow-sm
        transition-all duration-200 active:scale-[0.98] hover:bg-gray-50
        ${className}
      `}
      {...props}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      <span>{children}</span>
    </button>
  );
};
