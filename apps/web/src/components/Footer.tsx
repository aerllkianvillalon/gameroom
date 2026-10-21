import { Link } from 'react-router-dom';
import { Wordmark } from './Logo';
import { legalLinks } from '../legal/LegalPage';
import { LEGAL } from '../legal/config';

const cols = [
  { title: 'Play', links: [{ to: '/games', label: 'All games' }, { to: '/create', label: 'Create a room' }, { to: '/join', label: 'Join with a code' }, { to: '/packs', label: 'Word packs' }] },
  { title: 'Help', links: [{ to: '/rules', label: 'Rules' }, { to: '/settings', label: 'Settings' }, { to: '/cookies', label: 'Clear my data' }] },
  { title: 'Legal', links: legalLinks },
];

/** On phones the tab bar covers the bottom edge, so the footer keeps to the essentials and the rest lives in "More". */
export function Footer() {
  return (
    <footer className="mt-4 bg-ink-950/70" style={{ boxShadow: '0 -1px 0 rgb(var(--line) / .45)' }}>
      <div className="mx-auto hidden max-w-6xl grid-cols-[1.4fr_repeat(3,1fr)] gap-x-8 px-10 py-12 lg:grid">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-paper-dim">Party games for the table or the group chat. No account, no ads, no tracking.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-2 font-display text-base font-bold">{c.title}</h2>
            <ul>
              {c.links.map((l) => (
                <li key={l.to}><Link to={l.to} className="inline-flex min-h-[40px] items-center text-paper-dim underline-offset-4 hover:text-paper hover:underline">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-paper-dim sm:px-6 sm:text-sm lg:px-10" style={{ boxShadow: '0 -1px 0 rgb(var(--line) / .35)' }}>
        <p>Your name and settings stay on this device. © {new Date().getFullYear()} {LEGAL.operator}. Game names may be trademarks of their owners. GameRoom is not affiliated with them.</p>
      </div>
    </footer>
  );
}
