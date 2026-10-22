import { cn } from '../../lib/cn.js';

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Eventra AI"
      className={cn('shrink-0', className)}
    >
      <rect width="64" height="64" rx="16" fill="#17152B" />
      <path d="M20 44V20h6v24h-6Zm12 0V20h6v24h-6Z" fill="#7657E8" />
      <circle cx="44" cy="24" r="4" fill="#F5A7B8" />
      <circle cx="44" cy="36" r="4" fill="#EEE9FF" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Logo size={30} />
      <span className="leading-none">
        <span className="block font-display text-lg font-bold tracking-tight text-midnight">
          Eventra <span className="text-violet">AI</span>
        </span>
        <span className="block text-[0.7rem] font-medium text-slate">
          Every Celebration, Intelligently Planned
        </span>
      </span>
    </span>
  );
}
