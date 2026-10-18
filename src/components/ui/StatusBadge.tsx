import React from 'react';

export type StatusVariant =
  | 'success'
  | 'pending'
  | 'failed'
  | 'due_soon'
  | 'overdue'
  | 'clear'
  | 'inactive'
  | 'Success'
  | 'Pending'
  | 'Failed'
  | 'Due Soon'
  | 'Overdue'
  | 'Clear'
  | 'Inactive'
  | 'active'
  | 'closed';

interface StatusBadgeProps {
  status: StatusVariant | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const norm = String(status).toLowerCase().replace(/\s+/g, '_');

  const configMap: Record<
    string,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    success: {
      label: 'Success',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      border: 'border-emerald-800/40',
    },
    clear: {
      label: 'Clear',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      border: 'border-emerald-800/40',
    },
    active: {
      label: 'Active',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      border: 'border-emerald-800/40',
    },
    pending: {
      label: 'Pending',
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      border: 'border-amber-800/40',
    },
    due_soon: {
      label: 'Due Soon',
      bg: 'bg-[#3A3018]',
      text: 'text-[#F3D98B]',
      dot: 'bg-[#D4AF37]',
      border: 'border-[#D4AF37]/50',
    },
    overdue: {
      label: 'Overdue',
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      dot: 'bg-red-400 animate-pulse',
      border: 'border-red-800/40',
    },
    failed: {
      label: 'Failed',
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      dot: 'bg-red-400',
      border: 'border-red-800/40',
    },
    inactive: {
      label: 'Inactive',
      bg: 'bg-zinc-800/80',
      text: 'text-zinc-400',
      dot: 'bg-zinc-400',
      border: 'border-zinc-700/50',
    },
    closed: {
      label: 'Closed',
      bg: 'bg-zinc-800/80',
      text: 'text-zinc-400',
      dot: 'bg-zinc-500',
      border: 'border-zinc-700/50',
    },
  };

  const current = configMap[norm] || {
    label: status,
    bg: 'bg-zinc-800',
    text: 'text-zinc-300',
    dot: 'bg-zinc-400',
    border: 'border-zinc-700',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${current.bg} ${current.text} ${current.border}
        ${sizeClasses} ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};
