import { LinkButton } from '../ui/Button';

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="mx-auto max-w-md py-8 text-center sm:py-16">
      <div aria-hidden="true" className="relative mx-auto mb-8 h-36 w-40">
        <div className="pcard pcard-blue absolute left-2 top-4 h-32 w-[5.5rem] -rotate-12"><div className="pcard-face text-4xl"><span className="pcard-mid">4</span></div></div>
        <div className="pcard pcard-red absolute right-2 top-2 h-32 w-[5.5rem] rotate-12"><div className="pcard-face text-4xl"><span className="pcard-mid">0</span></div></div>
        <div className="pcard pcard-yellow absolute left-1/2 top-0 h-32 w-[5.5rem] -translate-x-1/2 rotate-[-2deg]"><div className="pcard-face text-4xl"><span className="pcard-mid">4</span></div></div>
      </div>
      <h1 className="page-title">We could not find that {what}</h1>
      <p className="lede mx-auto mt-3">The link may be mistyped or out of date.</p>
      <LinkButton to="/games" className="btn-lg mt-7">Browse games</LinkButton>
    </div>
  );
}
