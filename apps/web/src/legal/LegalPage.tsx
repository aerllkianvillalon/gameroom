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
    <article className="max-w-[44rem]">
      <h1 className="page-title">{title}</h1>
      <p className="pill mt-3">Last updated {LEGAL.updated}</p>
      <p className="lede mt-5 !text-[1.1875rem]">{intro}</p>
      {children}
    </article>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="section-title">{title}</h2>
      <div className="mt-3 space-y-3 text-[1.0625rem] leading-[1.7] text-paper/90 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li::marker]:text-card-yellow">{children}</div>
    </section>
  );
}

/** Short summary box at the top of a page. */
export function Summary({ children }: { children: ReactNode }) {
  return <div className="panel-flat mt-6 p-5 leading-relaxed">{children}</div>;
}

export function A({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="underline underline-offset-4 hover:text-white">{children}</Link>;
}

export function Contact() {
  return <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-4 hover:text-white">{LEGAL.contactEmail}</a>;
}
