import { describe, expect, it } from 'vitest';
import { IpGuard, clientIp } from './ipguard';

const mk = (now = () => 0) => new IpGuard({ maxConnectionsPerIp: 2, messageBurst: 3, messagesPerSec: 1, now });

describe('IpGuard', () => {
  it('caps concurrent connections per IP and frees slots on close', () => {
    const g = mk();
    expect(g.open('a')).toBe(true);
    expect(g.open('a')).toBe(true);
    expect(g.open('a')).toBe(false);
    expect(g.open('b')).toBe(true);
    g.close('a');
    expect(g.open('a')).toBe(true);
  });
  it('shares one message allowance across all of an IP\'s sockets and refills over time', () => {
    let t = 0;
    const g = mk(() => t);
    g.open('a');
    expect([g.allow('a'), g.allow('a'), g.allow('a'), g.allow('a')]).toEqual([true, true, true, false]);
    t = 2000;
    expect(g.allow('a')).toBe(true);
  });
  it('forgets an IP once its last socket closes', () => {
    const g = mk();
    g.open('a');
    g.close('a');
    expect(g.stats().ips).toBe(0);
  });
});

describe('clientIp', () => {
  const sock = (xff?: string) => ({ handshake: { address: '10.0.0.1', headers: xff ? { 'x-forwarded-for': xff } : {} } });
  it('ignores forwarded headers unless the proxy is trusted', () => {
    expect(clientIp(sock('1.2.3.4'), false)).toBe('10.0.0.1');
    expect(clientIp(sock('1.2.3.4, 9.9.9.9'), true)).toBe('1.2.3.4');
    expect(clientIp(sock(), true)).toBe('10.0.0.1');
  });
});
