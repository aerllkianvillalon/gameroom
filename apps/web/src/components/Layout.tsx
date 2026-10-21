import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { KeyRound, Plus, WifiOff } from 'lucide-react';
import { useBrowserOnline } from '../hooks/useOnline';
import { useOnline } from '../hooks/useOnlineClient';
import { getOnlineClient } from '../transport/online-instance';
import { Ambient } from './Ambient';
import { Footer } from './Footer';
import { Wordmark } from './Logo';
import { MoreSheet } from './MoreSheet';
import { TabBar } from './TabBar';

const nav = [
  { to: '/games', label: 'Games' },
  { to: '/rules', label: 'Rules' },
  { to: '/packs', label: 'Word packs' },
  { to: '/settings', label: 'Settings' },
];

/** Hides the top bar while scrolling down and brings it back on any scroll up (or near the top). */
function useHideOnScroll(paused: boolean): boolean {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    last.current = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = Math.max(0, window.scrollY);
        const dy = y - last.current;
        if (y < 72) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        if (Math.abs(dy) > 6 || y < 72) last.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);
  return hidden && !paused;
}

export function Layout() {
  const online = useBrowserOnline();
  const conn = useOnline();
  const hasSession = conn.session !== null;
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // At a table (local or online) the screen belongs to the game: no tab bar, no footer.
  const inGame = pathname.startsWith('/play/') || pathname.startsWith('/room/');
  // Holding a seat from before (e.g. after a reload)? Reconnect and resume it.
  useEffect(() => { if (hasSession) getOnlineClient().connect(); }, [hasSession]);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const close = () => setOpen(false);
  const barHidden = useHideOnScroll(open);

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col">
      <Ambient />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2 focus:text-ink-900">Skip to content</a>

      <header data-hidden={barHidden} className="topbar sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
          <Link to="/" className="justify-self-start rounded-xl" aria-label="GameRoom home"><Wordmark /></Link>
          <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className="navlink">{n.label}</NavLink>)}
          </nav>
          <div className="flex items-center justify-self-end gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-paper-dim" title={online ? 'Connected' : 'No internet'}>
              <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-card-green shadow-[0_0_0_4px_rgb(var(--card-green)/0.2)]' : 'bg-card-yellow'}`} aria-hidden="true" />
              <span className="sr-only">{online ? 'Online' : 'Offline'}</span>
            </span>
            {!inGame && (
              <>
                <Link to="/join" className="btn btn-secondary hidden !min-h-[44px] lg:inline-flex"><KeyRound size={18} aria-hidden="true" /> <span>Join<span className="hidden xl:inline"> with a code</span></span></Link>
                <Link to="/create" className="btn btn-primary hidden !min-h-[44px] lg:inline-flex"><Plus size={18} strokeWidth={3} aria-hidden="true" /> <span>Create<span className="hidden xl:inline"> a room</span></span></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {online && hasSession && conn.status !== 'connected' && (
        <div role="status" className="hint mx-4 mt-3 text-center text-sm sm:mx-auto sm:max-w-xl">
          Reconnecting to room {conn.session?.code}...{conn.slow ? ' The free server may be waking up. This can take about a minute.' : ''}
        </div>
      )}
      {!online && (
        <div role="status" className="hint mx-4 mt-3 flex items-center justify-center gap-2 text-sm sm:mx-auto sm:max-w-xl">
          <WifiOff size={16} aria-hidden="true" /> You are offline. Pass and play and bots still work; online rooms do not.
        </div>
      )}

      <main id="main" className={`mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 ${inGame ? '' : 'has-tabbar'}`}><div key={pathname} className="fade-in"><Outlet /></div></main>
      {!inGame && <Footer />}
      {!inGame && <TabBar onMore={() => setOpen(true)} moreOpen={open} />}
      <MoreSheet open={open} onClose={close} />
    </div>
  );
}