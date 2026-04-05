import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'purple' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    green: 'bg-accent-green/10 text-accent-green',
    red: 'bg-accent-red/10 text-accent-red',
    yellow: 'bg-accent-yellow/10 text-accent-yellow',
    purple: 'bg-accent-purple/10 text-accent-purple',
    default: 'bg-bg-tertiary text-text-tertiary',
  };

  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
