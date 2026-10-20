import Fastify from 'fastify';
import { loadConfig } from './config';
import { Hub } from './hub';
import { attachSocket } from './socket';

const cfg = loadConfig(process.env);
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
const hub = new Hub();

app.get('/health', async () => ({ ok: true, ...hub.stats(), uptimeSeconds: Math.round(process.uptime()) }));

const io = attachSocket(app, hub, cfg);

const shutdown = async () => {
  hub.dispose();
  io.close();
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ port: cfg.port, host: cfg.host });
