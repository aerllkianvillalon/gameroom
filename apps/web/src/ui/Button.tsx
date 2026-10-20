import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';
const base =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-paper text-ink-900 hover:bg-white disabled:hover:bg-paper',
  secondary: 'border border-line text-paper hover:bg-ink-700 disabled:hover:bg-transparent',
  ghost: 'text-paper-dim hover:bg-ink-700 hover:text-paper',
};

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...p} />;
}

export function LinkButton({ variant = 'primary', className = '', ...p }: LinkProps & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...p} />;
}
