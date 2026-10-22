import { useParams } from 'react-router-dom';
import { canCreateRoom, getGame, MODE_LABELS } from '@party/game-registry';
import { LinkButton } from '../ui/Button';
import { GameArt } from '../ui/GameArt';
import { StatusBadge, playersLabel } from '../ui/GameBits';
import { NotFound } from './NotFound';

export function GameDetails() {
  const { id = '' } = useParams();
  const g = getGame(id);
  if (!g) return <NotFound what="game" />;
  return (
    <article className="pb-4">
      <div className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-24">
          <GameArt id={g.id} accent={g.accent} className="h-60 rounded-[32px] shadow-[0_28px_40px_-22px_rgb(0_0_0/0.9)] sm:h-80 lg:h-[26rem]" />
        </div>
        <div className="mt-7 lg:mt-0">
          <StatusBadge status={g.status} />
          <h1 className="page-title mt-3 !text-[clamp(2.75rem,10vw,4.5rem)]">{g.title}</h1>
          <p className="lede mt-4 !text-[1.1875rem]">{g.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="panel-flat p-4"><dt className="text-sm text-paper-dim">Players</dt><dd className="mt-1 font-display text-xl font-extrabold leading-tight tracking-[-0.02em]">{playersLabel(g.minPlayers, g.maxPlayers)}</dd></div>
            <div className="panel-flat p-4"><dt className="text-sm text-paper-dim">Ways to play</dt><dd className="mt-1 font-semibold leading-snug">{g.modes.map((m) => MODE_LABELS[m]).join(', ')}</dd></div>
          </dl>

          {g.status === 'in-development' && <p className="hint mt-6">Gameplay is still being built. You can set up a local room and look at the settings, but you cannot start a round yet.</p>}
          <div className="mt-7">
            {canCreateRoom(g) ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                {g.modes.some((m) => m === 'pass-and-play' || m === 'bots') && <LinkButton to={`/create?game=${g.id}`} className="btn-lg">Play on this device</LinkButton>}
                {g.modes.includes('online') && <LinkButton to={`/create?game=${g.id}&mode=online`} variant={g.modes.includes('pass-and-play') || g.modes.includes('bots') ? 'secondary' : 'primary'} className="btn-lg">Play online with a code</LinkButton>}
              </div>
            ) : (
              <div className="panel-flat p-5">
                <p className="text-paper-dim">This one is still being planned, so you cannot play it yet.</p>
                <LinkButton to="/games" variant="secondary" className="mt-4">Pick another game</LinkButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {g.rules.length > 0 && (
        <section className="mt-14" aria-labelledby="how">
          <h2 id="how" className="section-title !text-[1.875rem]">How to play</h2>
          <ol className="mt-5 grid max-w-3xl gap-3">
            {g.rules.map((r, i) => (
              <li key={r} className="panel-flat flex gap-4 p-4 sm:p-5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold text-ink-950" style={{ background: g.accent }} aria-hidden="true">{i + 1}</span>
                <span className="pt-1 text-[1.0625rem] leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {g.settings.length > 0 && (
        <section className="mt-12" aria-labelledby="settings">
          <h2 id="settings" className="section-title">Settings you can change</h2>
          <ul className="mt-4 flex flex-wrap gap-2">{g.settings.map((s) => <li key={s.key} className="pill !text-[0.9375rem] !text-paper">{s.label}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
