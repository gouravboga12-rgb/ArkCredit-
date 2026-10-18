import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, icon, hint, type = 'text', className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-akr-text-muted mb-1.5 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-akr-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={`
              w-full bg-akr-surface border text-akr-text-primary text-sm rounded-button
              transition-all duration-200 outline-none
              placeholder:text-akr-text-dim
              ${icon ? 'pl-11' : 'pl-4'}
              ${isPassword ? 'pr-11' : 'pr-4'}
              py-3 min-h-[46px]
              ${
                error
                  ? 'border-akr-danger focus:ring-1 focus:ring-akr-danger focus:border-akr-danger'
                  : 'border-akr-border focus:border-akr-gold focus:ring-1 focus:ring-akr-gold/40'
              }
              ${props.readOnly ? 'bg-akr-bg text-akr-text-muted cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1 text-akr-text-muted hover:text-akr-gold transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-akr-danger mt-1.5 font-medium animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {hint && !error && (
          <p className="text-[11px] text-akr-text-dim mt-1">{hint}</p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
