import { useState } from 'react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import type { Role, WerewolfAction, WerewolfPrivateView, WerewolfPublicView } from '@party/werewolf-engine';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Panel } from '../impostor/parts';
import { BackToLobby, clock, GameHeader, TimerBar } from '../shared';
import { useCelebrate } from '../../hooks/useCelebrate';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';

interface Props {
  pub: WerewolfPublicView; priv: WerewolfPrivateView; me: PlayerId; isHost: boolean; skewMs: number;
  nameOf: (id: PlayerId) => string; avatarOf: (id: PlayerId) => AvatarId;
  send: (a: WerewolfAction) => Promise<string | null>; onLeave: () => void; onBack: () => void;
}

const ROLE_NAME: Record<Role, string> = { villager: 'Villager', werewolf: 'Werewolf', seer: 'Seer', doctor: 'Doctor' };
const ROLE_HELP: Record<Role, string> = {
  villager: 'You have no night power. Listen, argue and vote the werewolves out.',
  werewolf: 'Each night the pack picks a victim. By day, blend in with the village.',
  seer: 'Each night you learn whether one player is a werewolf. Use it wisely.',
  doctor: 'Each night you protect one player. You cannot protect the same player two nights in a row.',
};

function Picker({ options, value, onChange, nameOf, avatarOf, label }: {
  options: PlayerId[]; value: PlayerId | null; onChange: (id: PlayerId) => void; nameOf: (id: PlayerId) => string; avatarOf: (id: PlayerId) => AvatarId; label: string;
}) {
  return (
    <fieldset className="mt-4 space-y-2">
      <legend className="sr-only">{label}</legend>
      {options.map((id) => (
        <label key={id} className="choice">
          <input type="radio" name={label} checked={value === id} onChange={() => onChange(id)} />
          <Avatar id={avatarOf(id)} size={32} /><span className="font-semibold">{nameOf(id)}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function OnlineWerewolf({ pub, priv, me, isHost, skewMs, nameOf, avatarOf, send, onLeave, onBack }: Props) {
  const [pick, setPick] = useState<PlayerId | null>(null);
  const [roleShown, setRoleShown] = useState(true);
  const [notice, setNotice] = useState('');
  const secs = useSecondsLeft(pub.deadline === null ? null : pub.deadline - skewMs);
  const o = pub.outcome;
  useCelebrate(o ? (o.winner === 'wolves') === (o.roles[me] === 'werewolf') : false);
  const act = async (a: WerewolfAction) => { const p = await send(a); setNotice(p ?? ''); if (p === null) setPick(null); return p === null; };
  const living = pub.alive.filter((id) => id !== me);
  const total = pub.phase === 'night' ? pub.config.nightSeconds : pub.phase === 'discussion' ? pub.config.discussionSeconds : pub.config.voteSeconds;
  const timer = secs !== null && (
    <div>
      <p className={`font-display text-4xl font-bold ${secs <= 5 ? 'text-card-red' : ''}`} aria-label={`${secs} seconds left`}>{clock(secs)}</p>
      <div className="mt-2 max-w-sm"><TimerBar secs={secs} total={total} /></div>
    </div>
  );
  const pack = priv.pack.filter((id) => id !== me);

  let body;
  if (pub.phase === 'roles') {
    body = priv.hasAcked ? (
      <Panel><h2 className="section-title !text-[1.625rem]">Waiting for everyone</h2><p className="mt-2 text-paper-dim">{pub.acked} of {pub.order.length} players have seen their role.</p></Panel>
    ) : roleShown ? (
      <Panel>
        <p className="text-sm font-semibold text-paper-dim">Only you can see this</p>
        <h2 className="mt-2 font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.03em]">You are the {ROLE_NAME[priv.role]}</h2>
        <p className="mt-3 max-w-md text-paper-dim">{ROLE_HELP[priv.role]}</p>
        {priv.role === 'werewolf' && pack.length > 0 && <p className="mt-3">Your pack: <strong>{pack.map(nameOf).join(', ')}</strong></p>}
        <Button className="btn-lg mt-6 w-full sm:w-auto" onClick={async () => { setRoleShown(false); if (!(await act({ type: 'ack-role' }))) setRoleShown(true); }}>Got it</Button>
      </Panel>
    ) : <Panel><p>Sending...</p></Panel>;
  } else if (pub.phase === 'night') {
    const role = priv.role;
    const acting = priv.isAlive && (role === 'werewolf' || role === 'seer' || role === 'doctor');
    const options = role === 'doctor' ? pub.alive.filter((id) => id !== priv.cannotProtect) : role === 'werewolf' ? living.filter((id) => !priv.pack.includes(id)) : living;
    const verb = role === 'werewolf' ? 'Choose a victim' : role === 'seer' ? 'Who do you want to inspect?' : 'Who do you want to protect?';
    const type = role === 'werewolf' ? 'kill' : role === 'seer' ? 'inspect' : 'protect';
    body = (
      <Panel tone="plain">
        <p className="pill">Night {pub.day}</p>
        <div className="mt-2">{timer}</div>
        {!priv.isAlive ? <p className="mt-3 text-paper-dim">You are out. The village sleeps without you.</p>
          : !acting ? <><h2 className="section-title mt-3 !text-[1.625rem]">The village sleeps</h2><p className="mt-2 text-paper-dim">Close your eyes and wait for morning. Everyone sees the same screen, so nobody can tell who has a night power.</p></>
          : priv.chosen ? <><h2 className="section-title mt-3 !text-[1.625rem]">Choice locked in</h2><p className="mt-2 text-paper-dim">You picked {nameOf(priv.chosen)}.{role === 'werewolf' && ' If the pack splits, nobody is killed.'}</p></>
          : (
            <>
              <h2 className="section-title mt-3 !text-[1.625rem]">{verb}</h2>
              {role === 'werewolf' && pack.length > 0 && <p className="mt-1 text-sm text-paper-dim">Your pack: {pack.map(nameOf).join(', ')}. Agree on one victim.{Object.keys(priv.packVotes).length > 0 && ` Picked so far: ${Object.entries(priv.packVotes).map(([w, t]) => `${nameOf(w)} chose ${nameOf(t)}`).join('; ')}.`}</p>}
              {role === 'doctor' && priv.cannotProtect && <p className="mt-1 text-sm text-paper-dim">You cannot pick {nameOf(priv.cannotProtect)} again tonight.</p>}
              <Picker options={options} value={pick} onChange={setPick} nameOf={nameOf} avatarOf={avatarOf} label={verb} />
              <Button className="btn-lg mt-5 w-full sm:w-auto" disabled={!pick} onClick={() => pick && void act({ type, target: pick } as WerewolfAction)}>Confirm</Button>
            </>
          )}
        {role === 'seer' && priv.seerResults.length > 0 && (
          <ul className="mt-5 space-y-1" aria-label="What you have learned">
            {priv.seerResults.map((r) => <li key={r.night}>Night {r.night}: {nameOf(r.target)} is {r.wolf ? 'a werewolf' : 'not a werewolf'}.</li>)}
          </ul>
        )}
      </Panel>
    );
  } else if (pub.phase === 'discussion') {
    const r = pub.report;
    body = (
      <Panel>
        <p className="pill">Day {pub.day}</p>
        <h2 className="section-title mt-1 !text-[1.75rem]">{r?.killed ? `${nameOf(r.killed)} was killed in the night` : r?.saved ? 'Someone was attacked, but saved' : 'Nobody died in the night'}</h2>
        {r?.killed && pub.config.revealRoles && <p className="mt-1 text-paper-dim">They were a {ROLE_NAME[pub.dead.find((d) => d.id === r.killed)?.role ?? 'villager']}.</p>}
        <p className="mt-3 max-w-md text-paper-dim">Talk it through in voice chat or in person. Who is acting strangely?</p>
        <div className="mt-3">{timer}</div>
        {priv.isAlive && <Button className="btn-lg mt-5 w-full sm:w-auto" variant="secondary" onClick={() => void act({ type: 'skip-discussion' })}>Move to the vote</Button>}
      </Panel>
    );
  } else if (pub.phase === 'voting') {
    body = !priv.isAlive ? (
      <Panel><h2 className="section-title !text-[1.625rem]">The village is voting</h2><p className="mt-2 text-paper-dim">{pub.voted.length} of {pub.alive.length} votes cast.</p>{timer}</Panel>
    ) : priv.myVote ? (
      <Panel><h2 className="section-title !text-[1.625rem]">Vote locked in</h2><p className="mt-2 text-paper-dim">You voted for {nameOf(priv.myVote)}. {pub.voted.length} of {pub.alive.length} votes cast.</p>{timer}</Panel>
    ) : (
      <Panel>
        <h2 className="section-title !text-[1.625rem]">Who should the village eliminate?</h2>
        <div className="mt-2">{timer}</div>
        <Picker options={living} value={pick} onChange={setPick} nameOf={nameOf} avatarOf={avatarOf} label="Your vote" />
        <Button className="btn-lg mt-5 w-full sm:w-auto" disabled={!pick} onClick={() => pick && void act({ type: 'vote', target: pick })}>Lock in my vote</Button>
      </Panel>
    );
  } else if (o) {
    body = (
      <Panel>
        <h2 className="section-title !text-[2rem]">{o.winner === 'village' ? 'The village wins' : 'The werewolves win'}</h2>
        <p className="mt-1 text-paper-dim">{o.winner === 'village' ? 'Every werewolf was found.' : 'The werewolves now equal the rest of the village.'} It lasted {o.day} {o.day === 1 ? 'day' : 'days'}.</p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Roles">
          {pub.order.map((id) => <li key={id} className="panel-flat flex items-center gap-3 p-3"><Avatar id={avatarOf(id)} size={32} /><span className="flex-1 font-semibold">{nameOf(id)}</span><span className="text-paper-dim">{ROLE_NAME[o.roles[id] as Role]}</span></li>)}
        </ul>
        <div className="mt-6"><BackToLobby isHost={isHost} onBack={onBack} /></div>
      </Panel>
    );
  }

  const lv = pub.lastVotes;
  return (
    <div className="space-y-5">
      <GameHeader title="Werewolf" onLeave={onLeave} />
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}
      {pub.phase !== 'roles' && <p className="text-paper-dim">You are the <strong className="text-paper">{ROLE_NAME[priv.role]}</strong>{priv.role === 'werewolf' && pack.length > 0 ? `, with ${pack.map(nameOf).join(', ')}` : ''}. {pub.alive.length} alive, {pub.wolfCount} {pub.wolfCount === 1 ? 'werewolf' : 'werewolves'} among the players.</p>}
      {lv && pub.phase !== 'voting' && pub.phase !== 'results' && pub.phase !== 'discussion' && (
        <Panel tone="plain">
          <h2 className="section-title !text-[1.25rem]">{lv.lynched ? `${nameOf(lv.lynched)} was eliminated` : 'The vote was tied: nobody was eliminated'}</h2>
          {lv.lynched && pub.config.revealRoles && <p className="mt-1 text-paper-dim">They were a {ROLE_NAME[pub.dead.find((d) => d.id === lv.lynched)?.role ?? 'villager']}.</p>}
        </Panel>
      )}
      <div key={pub.phase}>{body}</div>
      <section aria-label="Players">
        <ul className="grid gap-2 sm:grid-cols-2">
          {pub.order.map((id) => {
            const dead = pub.dead.find((d) => d.id === id);
            return (
              <li key={id} className={`panel-flat flex items-center gap-3 p-3 ${dead ? 'opacity-50' : ''}`}>
                <Avatar id={avatarOf(id)} size={32} />
                <span className="flex-1 font-semibold">{nameOf(id)}{id === me && <span className="ml-2 text-sm font-normal text-paper-dim">You</span>}</span>
                {dead ? <span className="text-sm text-paper-dim">{dead.role ? ROLE_NAME[dead.role] : 'Out'}</span> : pack.includes(id) ? <span className="text-sm text-card-red">Pack</span> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
