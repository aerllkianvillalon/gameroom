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
  playable: { label: 'Playable', cls: 'border-card-green text-card-green' },
  'in-development': { label: 'In development', cls: 'border-card-yellow text-card-yellow' },
  'coming-soon': { label: 'Coming soon', cls: 'border-line text-paper-dim' },
};
export function StatusBadge({ status }: { status: GameStatus }) {
  const s = STATUS[status];
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-sm font-medium ${s.cls}`}>{s.label}</span>;
}

export const playersLabel = (min: number, max: number) => (min === max ? `${min} players` : `${min} to ${max} players`);
