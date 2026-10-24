import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

interface ErrorAlertProps {
  message: string;
  className?: string;
  role?: 'alert' | 'status';
}

export function ErrorAlert({ message, className, role = 'alert' }: ErrorAlertProps) {
  if (!message) return null;
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
