import { describe, expect, it } from 'vitest';
import { getGame } from '@party/game-registry';
import { sanitizeSettings } from './settings';
import { loadConfig } from './config';
import { TokenBucket } from './ratelimit';

describe('sanitizeSettings', () => {
  const uno = getGame('uno')!;
  it('keeps valid values, clamps numbers and drops unknown keys and wrong types', () => {
    const out = sanitizeSettings(uno, { unoPenalty: 99, turnTimer: -5, stackDraws: 'yes' as unknown as boolean, botDifficulty: 'hard', evil: true });
    expect(out).toEqual({ unoPenalty: 4, turnTimer: 0, botDifficulty: 'hard' });
  });
  it('ignores NaN and Infinity', () => {
    expect(sanitizeSettings(uno, { unoPenalty: NaN, turnTimer: Infinity })).toEqual({});
  });
});

describe('loadConfig', () => {
  it('has safe defaults and parses origins', () => {
    expect(loadConfig({}).port).toBe(3001);
    expect(loadConfig({ PORT: 'abc' }).port).toBe(3001);
    expect(loadConfig({ PORT: '10000' }).port).toBe(10000);
    expect(loadConfig({ ALLOWED_ORIGINS: 'https://a.dev/, https://b.dev' }).allowedOrigins).toEqual(['https://a.dev', 'https://b.dev']);
    expect(loadConfig({ ALLOWED_ORIGINS: '*' }).allowedOrigins).toBe('*');
    expect(loadConfig({}).trustProxy).toBe(false);
    expect(loadConfig({ TRUST_PROXY: 'true' }).trustProxy).toBe(true);
    expect(loadConfig({}).maxConnectionsPerIp).toBe(20);
    expect(loadConfig({ MAX_CONNECTIONS_PER_IP: '-3' }).maxConnectionsPerIp).toBe(20);
  });
});

describe('TokenBucket', () => {
  it('allows a burst, then refills over time', () => {
    let t = 0;
    const b = new TokenBucket(3, 1, () => t);
    expect([b.take(), b.take(), b.take(), b.take()]).toEqual([true, true, true, false]);
    t = 2000;
    expect(b.take(2)).toBe(true);
    expect(b.take()).toBe(false);
  });
});
