import { Link } from 'react-router-dom';
import { Wordmark } from './Logo';
import { legalLinks } from '../legal/LegalPage';
import { LEGAL } from '../legal/config';

const cols = [
  { title: 'Play', links: [{ to: '/games', label: 'All games' }, { to: '/create', label: 'Create a room' }, { to: '/join', label: 'Join with a code' }, { to: '/packs', label: 'Word packs' }] },
  { title: 'Help', links: [{ to: '/rules', label: 'Rules' }, { to: '/settings', label: 'Settings' }, { to: '/cookies', label: 'Clear my data' }] },
  { title: 'Legal', links: legalLinks },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-ink-950/80 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div className="col-span-2 md:col-span-1">
          <Wordmark />
          <p className="mt-3 max-w-xs text-paper-dim">Party games for the table or the group chat. No account, no ads, no tracking.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-2 text-base font-bold">{c.title}</h2>
            <ul>
              {c.links.map((l) => (
                <li key={l.to}><Link to={l.to} className="inline-flex min-h-[40px] items-center text-paper-dim underline-offset-4 hover:text-paper hover:underline">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-paper-dim sm:px-6">
        <p>Your name and settings stay on this device. © {new Date().getFullYear()} {LEGAL.operator}.</p>
        <p className="mt-1">Game names may be trademarks of their owners. GameRoom is not affiliated with them.</p>
      </div>
    </footer>
  );
}
