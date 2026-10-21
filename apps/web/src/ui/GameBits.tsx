import { Bomb, Brain, EyeOff, Layers, LayoutGrid, Moon, Pencil, Scale, Zap, type LucideIcon } from 'lucide-react';
import type { GameStatus } from '@party/game-registry';

const ICONS: Record<string, LucideIcon> = {
  uno: Layers, impostor: EyeOff, trivia: Brain, wordbomb: Bomb, werewolf: Moon, drawing: Pencil, wyr: Scale, memory: LayoutGrid, reaction: Zap,
};
export function GameIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon = ICONS[id] ?? Layers;
  return <Icon size={size} aria-hidden="true" />;
}

const STATUS: Record<GameStatus, { label: string; cls: string }> = {
  playable: { label: 'Playable', cls: 'bg-card-green/15 text-card-green shadow-[inset_0_0_0_1.5px_rgb(var(--card-green)/0.7)]' },
  'in-development': { label: 'In development', cls: 'bg-card-yellow/10 text-card-yellow shadow-[inset_0_0_0_1.5px_rgb(var(--card-yellow)/0.7)]' },
  'coming-soon': { label: 'Coming soon', cls: 'bg-ink-950/50 text-paper-dim shadow-[inset_0_0_0_1.5px_rgb(var(--line))]' },
};
export function StatusBadge({ status }: { status: GameStatus }) {
  const s = STATUS[status];
  return <span className={`inline-block shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold ${s.cls}`}>{s.label}</span>;
}

export const playersLabel = (min: number, max: number) => (min === max ? `${min} players` : `${min} to ${max} players`);
