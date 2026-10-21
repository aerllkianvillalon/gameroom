/** Three fanned cards. Drawn here, not borrowed from any game. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="shrink-0 drop-shadow-[0_2px_0_rgb(0_0_0/0.3)]">
      <rect x="4" y="6" width="14" height="20" rx="3" transform="rotate(-16 11 16)" fill="rgb(var(--card-blue))" />
      <rect x="9" y="5" width="14" height="20" rx="3" transform="rotate(-2 16 15)" fill="rgb(var(--card-yellow))" />
      <rect x="14" y="6" width="14" height="20" rx="3" transform="rotate(14 21 16)" fill="rgb(var(--card-red))" />
      <circle cx="21" cy="16.5" r="2.6" fill="rgb(var(--ink-900))" opacity="0.85" />
    </svg>
  );
}

export function Wordmark({ className = '', size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display font-extrabold leading-none tracking-[-0.035em] ${size === 'lg' ? 'text-3xl' : 'text-[1.65rem]'} ${className}`}>
      <LogoMark size={size === 'lg' ? 40 : 34} /> GameRoom
    </span>
  );
}
