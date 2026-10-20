import { listGames } from '@party/game-registry';

export function Rules() {
  const games = listGames().filter((g) => g.rules.length > 0);
  return (
    <div className="max-w-prose">
      <h1 className="text-4xl font-bold">Rules</h1>
      <p className="mt-2 text-paper-dim">Short rules for every game that has gameplay in progress. Planned games appear once they are built.</p>
      {games.map((g) => (
        <section key={g.id} className="mt-10" aria-labelledby={`r-${g.id}`}>
          <h2 id={`r-${g.id}`} className="border-l-8 pl-3 text-2xl font-bold" style={{ borderColor: g.accent }}>{g.title}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6">{g.rules.map((r) => <li key={r}>{r}</li>)}</ol>
        </section>
      ))}
    </div>
  );
}
