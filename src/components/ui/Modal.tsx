import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop overlay click dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={`
          relative z-10 w-full ${maxWidthClasses[maxWidth]} bg-akr-surface border-t sm:border border-akr-border/80 rounded-t-3xl sm:rounded-card
          shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slideUp sm:animate-scaleUp
        `}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Grab Indicator Pill */}
        <div className="w-12 h-1 bg-zinc-700/80 rounded-full mx-auto mt-2.5 sm:hidden" />

        {title && (
          <div className="px-5 py-3.5 sm:py-4 border-b border-akr-border/60 flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-wide font-sans">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-akr-bg text-akr-text-muted hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain">{children}</div>
      </div>
    </div>
  );
};

export const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className="
          relative z-10 w-full max-w-lg bg-akr-surface border-t border-akr-border/80 rounded-t-3xl
          p-5 shadow-2xl flex flex-col max-h-[88vh] animate-slideUp
        "
        role="dialog"
      >
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-akr-border rounded-full mx-auto mb-4" />

        {title && (
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-akr-border/60">
            <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-akr-text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
