import { LinkButton } from '../ui/Button';

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">We could not find that {what}</h1>
      <p className="mt-2 text-paper-dim">The link may be mistyped or out of date.</p>
      <LinkButton to="/games" className="mt-6">Browse games</LinkButton>
    </div>
  );
}
