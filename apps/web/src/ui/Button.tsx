import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';
const variants: Record<Variant, string> = { primary: 'btn btn-primary', secondary: 'btn btn-secondary', ghost: 'btn btn-ghost' };

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${variants[variant]} ${className}`} {...p} />;
}

export function LinkButton({ variant = 'primary', className = '', ...p }: LinkProps & { variant?: Variant }) {
  return <Link className={`${variants[variant]} ${className}`} {...p} />;
}
