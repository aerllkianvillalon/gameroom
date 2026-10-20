import { NavLink, Link } from 'react-router-dom';
import { BookOpen, Gamepad2, House, KeyRound, Layers, Plus, Settings, type LucideIcon } from 'lucide-react';
import { Wordmark } from './Logo';
import { useOnline } from '../hooks/useOnlineClient';

interface Item { to: string; label: string; icon: LucideIcon; end?: boolean }
const play: Item[] = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/games', label: 'All games', icon: Gamepad2 },
  { to: '/create', label: 'Create a room', icon: Plus },
  { to: '/join', label: 'Join with a code', icon: KeyRound },
];
const learn: Item[] = [
  { to: '/rules', label: 'Rules', icon: BookOpen },
  { to: '/packs', label: 'Word packs', icon: Layers },
  { to: '/settings', label: 'Settings', icon: Settings },
];

// Rows shrink on short screens (phones on their side) so the menu never needs to scroll.
const row = 'relative flex min-h-[48px] items-center gap-3 rounded-xl px-3 font-medium transition-colors [@media(max-height:560px)]:min-h-[40px]';

function Group({ label, items, onNavigate }: { label: string; items: Item[]; onNavigate?: () => void }) {
  return (
    <div>
      <p className="px-3 pb-1 text-sm font-medium text-paper-dim">{label}</p>
      <ul>
        {items.map(({ to, label: text, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) => `${row} hover:bg-ink-700 ${isActive ? 'bg-ink-700 text-paper' : 'text-paper-dim hover:text-paper'}`}
            >
              <Icon size={20} aria-hidden="true" /> {text}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The side menu: a fixed column on wide screens, the slide-in drawer on phones. No scrolling, it always fits. */
export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const conn = useOnline();
  const code = conn.session?.code;
  return (
    <div className="flex h-full flex-col gap-5 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] [@media(max-height:560px)]:gap-3">
      <Link to="/" onClick={onNavigate} className="rounded-lg px-1 py-1" aria-label="GameRoom home"><Wordmark /></Link>
      {code && (
        <Link to={`/room/${code}`} onClick={onNavigate} className="rounded-xl border border-card-yellow bg-ink-800 p-3 hover:bg-ink-700">
          <span className="block text-sm text-paper-dim">You are in a room</span>
          <span className="block font-display text-lg font-bold">Return to {code}</span>
        </Link>
      )}
      <nav aria-label="Main" className="flex flex-col gap-4 [@media(max-height:560px)]:gap-2 [@media(max-height:460px)]:grid [@media(max-height:460px)]:grid-cols-2 [@media(max-height:460px)]:items-start">
        <Group label="Play" items={play} onNavigate={onNavigate} />
        <Group label="Learn and set up" items={learn} onNavigate={onNavigate} />
      </nav>
    </div>
  );
}
