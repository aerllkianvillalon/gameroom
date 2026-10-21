import { listGames } from '@party/game-registry';
import { GameArt } from '../ui/GameArt';

export function Rules() {
  const games = listGames().filter((g) => g.rules.length > 0);
  return (
    <div className="max-w-[44rem] pb-4">
      <h1 className="page-title">Rules</h1>
      <p className="lede mt-3">Short rules for every game that has gameplay in progress. Planned games appear once they are built.</p>
      {games.map((g) => (
        <section key={g.id} className="panel mt-8 overflow-hidden" aria-labelledby={`r-${g.id}`}>
          <GameArt id={g.id} accent={g.accent} className="h-28 sm:h-32" />
          <div className="p-5 sm:p-6">
            <h2 id={`r-${g.id}`} className="section-title !text-[1.875rem]">{g.title}</h2>
            <ol className="mt-4 space-y-3">{g.rules.map((r, i) => (
              <li key={r} className="flex gap-3 text-[1.0625rem] leading-relaxed">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold text-ink-950" style={{ background: g.accent }} aria-hidden="true">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}</ol>
          </div>
        </section>
      ))}
    </div>
  );
}
