import { NavLink } from 'react-router-dom';
import { Gamepad2, House, KeyRound, Menu, Plus } from 'lucide-react';

const tab = 'tab';

/** Phone navigation: five thumb-sized tabs at the bottom, with "Create" raised in the middle. Hidden on wide screens and during a game. */
export function TabBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  return (
    <nav aria-label="Main" className="tabbar lg:hidden">
      <div className="tabbar-inner">
        <NavLink to="/" end className={tab}><House size={22} aria-hidden="true" />Home</NavLink>
        <NavLink to="/games" className={tab}><Gamepad2 size={22} aria-hidden="true" />Games</NavLink>
        <NavLink to="/create" className={`${tab} tab-main`}><Plus size={26} strokeWidth={3} aria-hidden="true" />Create</NavLink>
        <NavLink to="/join" className={tab}><KeyRound size={22} aria-hidden="true" />Join</NavLink>
        <button type="button" onClick={onMore} aria-haspopup="dialog" aria-expanded={moreOpen} className={tab}><Menu size={22} aria-hidden="true" />More</button>
      </div>
    </nav>
  );
}
