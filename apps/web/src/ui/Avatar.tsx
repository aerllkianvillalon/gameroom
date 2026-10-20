import { Bird, Cat, Dog, Fish, Rabbit, Snail, Squirrel, Turtle, type LucideIcon } from 'lucide-react';
import type { AvatarId } from '@party/game-engine';

const AVATARS: Record<AvatarId, { Icon: LucideIcon; bg: string }> = {
  cat: { Icon: Cat, bg: 'bg-card-red' },
  dog: { Icon: Dog, bg: 'bg-card-blue' },
  bird: { Icon: Bird, bg: 'bg-card-yellow' },
  fish: { Icon: Fish, bg: 'bg-card-green' },
  rabbit: { Icon: Rabbit, bg: 'bg-plum' },
  squirrel: { Icon: Squirrel, bg: 'bg-card-red' },
  turtle: { Icon: Turtle, bg: 'bg-card-green' },
  snail: { Icon: Snail, bg: 'bg-card-blue' },
};

export function Avatar({ id, size = 40 }: { id: AvatarId; size?: number }) {
  const { Icon, bg } = AVATARS[id];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full text-ink-950 ${bg}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={size * 0.55} strokeWidth={2.25} />
    </span>
  );
}
