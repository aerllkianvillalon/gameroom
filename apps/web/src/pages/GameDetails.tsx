import { useParams } from 'react-router-dom';
import { canCreateRoom, getGame, MODE_LABELS } from '@party/game-registry';
import { LinkButton } from '../ui/Button';
import { GameIcon, StatusBadge, playersLabel } from '../ui/GameBits';
import { NotFound } from './NotFound';

export function GameDetails() {
  const { id = '' } = useParams();
  const g = getGame(id);
  if (!g) return <NotFound what="game" />;
  return (
    <article>
      <div className="border-l-8 pl-5" style={{ borderColor: g.accent }}>
        <div className="flex flex-wrap items-center gap-3"><GameIcon id={g.id} size={30} /><StatusBadge status={g.status} /></div>
        <h1 className="mt-2 text-4xl font-bold">{g.title}</h1>
        <p className="mt-2 max-w-xl text-lg text-paper-dim">{g.description}</p>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm text-paper-dim">Players</dt><dd className="font-semibold">{playersLabel(g.minPlayers, g.maxPlayers)}</dd></div>
        <div><dt className="text-sm text-paper-dim">Ways to play</dt><dd className="font-semibold">{g.modes.map((m) => MODE_LABELS[m]).join(', ')}</dd></div>
      </dl>
      {g.status === 'in-development' && <p className="mt-6 max-w-xl rounded-lg border border-card-yellow bg-ink-800 p-4">Gameplay is still being built. You can set up a local room and look at the settings, but you cannot start a round yet.</p>}
      <div className="mt-6">
        {canCreateRoom(g) ? (
          <div className="flex flex-wrap gap-3">
            <LinkButton to={`/create?game=${g.id}`} className="min-h-[52px] px-8 text-lg">Play on this device</LinkButton>
            {g.modes.includes('online') && <LinkButton to={`/create?game=${g.id}&mode=online`} variant="secondary" className="min-h-[52px] px-8 text-lg">Play online with a code</LinkButton>}
          </div>
        ) : (
          <p className="text-paper-dim">This one is still being planned, so you cannot play it yet. <LinkButton to="/games" variant="ghost" className="inline-flex">Pick another game</LinkButton></p>
        )}
      </div>
      {g.settings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Settings</h2>
          <ul className="mt-3 space-y-1 text-paper-dim">{g.settings.map((s) => <li key={s.key}>{s.label}</li>)}</ul>
        </section>
      )}
      {g.rules.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">How to play</h2>
          <ol className="mt-3 max-w-prose list-decimal space-y-2 pl-6">{g.rules.map((r) => <li key={r}>{r}</li>)}</ol>
        </section>
      )}
    </article>
  );
}
