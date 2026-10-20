import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { KeyRound, Menu, Plus, WifiOff, X } from 'lucide-react';
import { useBrowserOnline } from '../hooks/useOnline';
import { useOnline } from '../hooks/useOnlineClient';
import { getOnlineClient } from '../transport/online-instance';
import { Ambient } from './Ambient';
import { Footer } from './Footer';
import { LogoMark } from './Logo';
import { SideNav } from './SideNav';

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

/** Slide-in menu for phones and tablets. Traps focus, closes on Escape, backdrop tap or navigation. */
function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
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
      <div className="drawer-backdrop absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" className="drawer-panel absolute inset-y-0 left-0 w-[min(20rem,86vw)] overflow-hidden [@media(max-height:460px)]:w-[min(30rem,80vw)] border-r border-line bg-ink-900 shadow-2xl">
        <button type="button" data-autofocus onClick={onClose} aria-label="Close menu" className="absolute right-2 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg text-paper-dim hover:bg-ink-700 hover:text-paper"><X size={22} aria-hidden="true" /></button>
        <SideNav onNavigate={onClose} />
      </div>
    </div>
  );
}

const quick = 'inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-semibold transition-colors sm:gap-2 sm:px-4';

export function Layout() {
  const online = useBrowserOnline();
  const conn = useOnline();
  const hasSession = conn.session !== null;
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // Holding a seat from before (e.g. after a reload)? Reconnect and resume it.
  useEffect(() => { if (hasSession) getOnlineClient().connect(); }, [hasSession]);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const close = () => setOpen(false);

  return (
    <div className="relative isolate min-h-[100dvh] lg:flex">
      <Ambient />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-paper focus:px-3 focus:py-2 focus:text-ink-900">Skip to content</a>

      <aside className="sticky top-0 hidden h-[100dvh] w-64 xl:w-72 shrink-0 border-r border-line bg-ink-950/85 backdrop-blur lg:block" aria-label="Menu">
        <SideNav />
      </aside>
      <Drawer open={open} onClose={close} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-ink-950/85 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2 sm:px-6 lg:px-10">
            <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-ink-700 lg:hidden"><Menu size={24} aria-hidden="true" /></button>
            <Link to="/" className="inline-flex items-center gap-2 rounded-lg font-display text-xl font-bold tracking-tight lg:hidden" aria-label="GameRoom home"><LogoMark size={28} /><span className="hidden min-[520px]:inline">GameRoom</span></Link>
            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
              <span className={`hidden items-center gap-2 text-sm text-paper-dim sm:inline-flex`}>
                <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-card-green' : 'bg-card-yellow'}`} aria-hidden="true" />
                {online ? 'Online' : 'Offline'}
              </span>
              <Link to="/join" className={`${quick} border border-line hover:bg-ink-700`}><KeyRound size={18} aria-hidden="true" /> Join<span className="hidden sm:inline"> with a code</span></Link>
              <Link to="/create" className={`${quick} bg-paper text-ink-900 hover:bg-white`}><Plus size={18} aria-hidden="true" /> <span>Create<span className="hidden sm:inline"> a room</span></span></Link>
            </div>
          </div>
        </header>

        {online && hasSession && conn.status !== 'connected' && (
          <div role="status" className="border-b border-card-yellow bg-ink-800 px-4 py-2 text-center text-sm">
            Reconnecting to room {conn.session?.code}...{conn.slow ? ' The free server may be waking up. This can take about a minute.' : ''}
          </div>
        )}
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 border-b border-card-yellow bg-ink-800 px-4 py-2 text-sm">
            <WifiOff size={16} aria-hidden="true" /> You are offline. Pass and play and bots still work; online rooms do not.
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"><div key={pathname} className="fade-in"><Outlet /></div></main>
        <Footer />
      </div>
    </div>
  );
}
