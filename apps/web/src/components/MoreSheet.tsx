import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Layers, Settings, X } from 'lucide-react';
import { legalLinks } from '../legal/LegalPage';
import { useOnline } from '../hooks/useOnlineClient';

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

/** Shorter names so all four fit on one line on a phone. */
const SHORT: Record<string, string> = { '/cookies': 'Cookies', '/community': 'Community' };

const items = [
  { to: '/rules', label: 'Rules', note: 'How each game works', icon: BookOpen, tone: 'rgb(var(--card-blue))' },
  { to: '/packs', label: 'Word packs', note: 'Your own words for ImpostorWho', icon: Layers, tone: 'rgb(var(--plum))' },
  { to: '/settings', label: 'Settings', note: 'Name, avatar, motion, sound', icon: Settings, tone: 'rgb(var(--card-green))' },
];

/** The "More" sheet for phones. Slides up, traps focus, closes on Escape, backdrop tap or navigation. */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const conn = useOnline();
  const code = conn.session?.code;

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const wide = window.matchMedia('(min-width: 1024px)');
    const onWide = () => { if (wide.matches) onClose(); };
    wide.addEventListener('change', onWide);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (els.length === 0) return;
      const first = els[0]!, last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="sheet-backdrop absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label="More"
        className="sheet-panel absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-lg overflow-y-auto rounded-t-[32px] bg-ink-800 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[inset_0_1.5px_0_rgb(var(--line)),0_-30px_60px_-20px_rgb(0_0_0/0.8)]"
      >
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="flex items-center justify-between py-2">
          <h2 className="section-title">More</h2>
          <button type="button" data-autofocus onClick={onClose} aria-label="Close" className="btn btn-ghost !min-h-[44px] !w-11 !px-0"><X size={22} aria-hidden="true" /></button>
        </div>
        {code && (
          <Link to={`/room/${code}`} onClick={onClose} className="hint mb-3 block">
            <span className="block text-sm text-paper-dim">You are in a room</span>
            <span className="block font-display text-lg font-bold">Return to {code}</span>
          </Link>
        )}
        <ul className="space-y-2">
          {items.map(({ to, label, note, icon: Icon, tone }) => (
            <li key={to}>
              <Link to={to} onClick={onClose} className="choice !cursor-pointer">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-ink-950" style={{ background: tone }}><Icon size={22} aria-hidden="true" /></span>
                <span className="min-w-0"><span className="block font-display text-lg font-bold leading-tight">{label}</span><span className="block text-sm text-paper-dim">{note}</span></span>
              </Link>
            </li>
          ))}
        </ul>
        <nav aria-label="Legal" className="mt-5 flex flex-nowrap items-center justify-between gap-1 border-t border-line/60 pt-2">
          {legalLinks.map((l) => <Link key={l.to} to={l.to} onClick={onClose} className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-1.5 text-[0.8125rem] text-paper-dim hover:text-paper">{SHORT[l.to] ?? l.label}</Link>)}
        </nav>
      </div>
    </div>
  );
}
