import type { ReactNode } from 'react';
import { cn } from '../../lib/cn.js';
import { Loader2 } from 'lucide-react';

export function ButtonSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'neutral' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const toneClass =
    tone === 'default'
      ? ''
      : tone === 'neutral'
        ? 'badge-neutral'
        : tone === 'success'
          ? 'badge-success'
          : tone === 'warning'
            ? 'badge-warning'
            : 'badge-danger';
  return <span className={cn('badge', toneClass, className)}>{children}</span>;
}

export function ProgressBar({
  value,
  label,
  tone = 'default',
  className,
}: {
  value: number;
  label?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  // The fill is capped at 100% but the number shown is the truth: an event at
  // 132% utilisation must say 132%, not a confident "100%".
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const displayed = Math.round(safeValue);
  const fillWidth = Math.min(100, safeValue);
  const fillClass =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'danger'
          ? 'bg-danger'
          : 'bg-violet';
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate">
          <span>{label}</span>
          <span className="font-semibold text-midnight-2">{displayed}%</span>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={Math.min(100, displayed)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div className={cn('progress-fill', fillClass)} style={{ width: `${fillWidth}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-midnight/15 bg-white/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="text-violet">{icon}</div>}
      <h3 className="text-base font-semibold text-midnight">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-5 py-4',
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-danger">{title}</h3>
      {message && <p className="text-sm text-danger/90">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
