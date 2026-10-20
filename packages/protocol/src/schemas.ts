import { z } from 'zod';
import { AVATAR_IDS } from '@party/game-engine';

const id = z.string().min(1).max(40);
const color = z.enum(['red', 'yellow', 'green', 'blue']);

export const UnoActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play'), cardId: z.number().int().min(0).max(1000), color: color.optional(), swapWith: id.optional(), callUno: z.boolean().optional() }),
  z.object({ type: z.literal('draw') }),
  z.object({ type: z.literal('pass') }),
  z.object({ type: z.literal('call-uno') }),
  z.object({ type: z.literal('catch-uno'), target: id }),
]);

export const ImpostorActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ack-role') }),
  z.object({ type: z.literal('clue'), text: z.string().max(200).optional() }),
  z.object({ type: z.literal('skip-discussion') }),
  z.object({ type: z.literal('vote'), target: id }),
  z.object({ type: z.literal('guess'), text: z.string().max(100) }),
]);

const settingValue = z.union([z.string().max(60), z.number().finite(), z.boolean()]);
const settings = z.record(z.string().max(40), settingValue).refine((o) => Object.keys(o).length <= 20, 'Too many settings');
const avatar = z.enum(AVATAR_IDS);
const name = z.string().max(64);
const code = z.string().min(1).max(16);

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), game: z.enum(['uno', 'impostor']), name, avatar, settings: settings.optional(), password: z.string().max(32).optional() }),
  z.object({ type: z.literal('join'), code, name, avatar, password: z.string().max(32).optional() }),
  z.object({ type: z.literal('resume'), code, token: z.string().min(8).max(128) }),
  z.object({ type: z.literal('ready'), ready: z.boolean() }),
  z.object({ type: z.literal('settings'), patch: settings }),
  z.object({ type: z.literal('add-bot') }),
  z.object({ type: z.literal('kick'), playerId: id }),
  z.object({ type: z.literal('start'), pack: z.object({ name: z.string().max(30), words: z.array(z.string().max(30)).max(200) }).optional() }),
  z.object({ type: z.literal('action'), action: z.union([UnoActionSchema, ImpostorActionSchema]) }),
  z.object({ type: z.literal('back-to-lobby') }),
  z.object({ type: z.literal('leave') }),
]);
