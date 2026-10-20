export interface Config { port: number; host: string; allowedOrigins: string[] | '*'; trustProxy: boolean; maxConnectionsPerIp: number }

export function loadConfig(env: Record<string, string | undefined>): Config {
  const port = Number(env.PORT ?? 3001);
  const raw = (env.ALLOWED_ORIGINS ?? 'http://localhost:5173').trim();
  return {
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 3001,
    host: env.HOST ?? '0.0.0.0',
    trustProxy: env.TRUST_PROXY === 'true',
    maxConnectionsPerIp: positiveInt(env.MAX_CONNECTIONS_PER_IP, 20),
    allowedOrigins: raw === '*' ? '*' : raw.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
  };
}

function positiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
