import { TokenBucket } from './ratelimit';

export interface IpGuardOptions {
  maxConnectionsPerIp: number;
  /** Burst size and steady rate of messages allowed from one IP across all its sockets. */
  messageBurst: number;
  messagesPerSec: number;
  now?: () => number;
}

/**
 * Per-IP limits that sit in front of the hub's per-socket limits: a client opening many sockets
 * cannot multiply its allowance. Pure: no sockets, so it is unit-tested directly.
 */
export class IpGuard {
  private conns = new Map<string, number>();
  private buckets = new Map<string, TokenBucket>();
  private now: () => number;

  constructor(private opts: IpGuardOptions) {
    this.now = opts.now ?? Date.now;
  }

  /** Call when a socket connects. False means refuse it. */
  open(ip: string): boolean {
    const n = this.conns.get(ip) ?? 0;
    if (n >= this.opts.maxConnectionsPerIp) return false;
    this.conns.set(ip, n + 1);
    return true;
  }

  /** Call when an accepted socket closes. */
  close(ip: string) {
    const n = (this.conns.get(ip) ?? 0) - 1;
    if (n > 0) { this.conns.set(ip, n); return; }
    this.conns.delete(ip);
    this.buckets.delete(ip);
  }

  /** True when this message may proceed. */
  allow(ip: string, cost = 1): boolean {
    let b = this.buckets.get(ip);
    if (!b) this.buckets.set(ip, (b = new TokenBucket(this.opts.messageBurst, this.opts.messagesPerSec, this.now)));
    return b.take(cost);
  }

  stats() { return { ips: this.conns.size }; }
}

/** Client IP. Forwarded headers are only believed when the operator says a trusted proxy sets them. */
export function clientIp(
  socket: { handshake: { address: string; headers: Record<string, string | string[] | undefined> } },
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const fwd = socket.handshake.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return socket.handshake.address;
}
