import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8 rounded-card
        bg-akr-surface/60 border border-akr-border/50 my-4
        ${className}
      `}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-akr-bg text-akr-gold border border-akr-gold/20 flex items-center justify-center mb-3.5 shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      {description && <p className="text-xs text-akr-text-muted max-w-xs mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
};

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export const Toast: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
          error: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
          warning: <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
        };

        return (
          <div
            key={toast.id}
            className="
              pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-akr-surface border border-akr-border
              shadow-2xl text-left animate-slideUp transition-all duration-300
            "
            onClick={() => onDismiss(toast.id)}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              {toast.title && <h5 className="text-xs font-bold text-white mb-0.5">{toast.title}</h5>}
              <p className="text-xs text-zinc-300 leading-relaxed">{toast.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
