import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL } from './config';

export const legalLinks = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/cookies', label: 'Cookies and storage' },
  { to: '/community', label: 'Community rules' },
];

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <article className="max-w-prose">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-paper-dim">Last updated {LEGAL.updated}</p>
      <p className="mt-4 text-lg text-paper-dim">{intro}</p>
      {children}
    </article>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-2xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">{children}</div>
    </section>
  );
}

/** Short summary box at the top of a page. */
export function Summary({ children }: { children: ReactNode }) {
  return <div className="mt-6 rounded-xl border border-line bg-ink-800 p-5 leading-relaxed">{children}</div>;
}

export function A({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="underline underline-offset-4 hover:text-white">{children}</Link>;
}

export function Contact() {
  return <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-4 hover:text-white">{LEGAL.contactEmail}</a>;
}
