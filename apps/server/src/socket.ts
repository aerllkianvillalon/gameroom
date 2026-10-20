import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { CLIENT_EVENT, ClientMessageSchema, type Ack, type ClientMessage } from '@party/protocol';
import type { Config } from './config';
import type { Conn, Hub } from './hub';
import { IpGuard, clientIp } from './ipguard';

/** Thin glue: validate every incoming payload with zod, then hand it to the Hub. All rules live in the Hub. */
export function attachSocket(app: FastifyInstance, hub: Hub, cfg: Config): Server {
  const io = new Server(app.server, {
    cors: { origin: cfg.allowedOrigins === '*' ? true : cfg.allowedOrigins },
    maxHttpBufferSize: 16 * 1024, // messages are tiny; refuse anything big
    pingInterval: 20_000,
    pingTimeout: 20_000,
  });

  const guard = new IpGuard({ maxConnectionsPerIp: cfg.maxConnectionsPerIp, messageBurst: 80, messagesPerSec: 40 });

  io.on('connection', (socket) => {
    const ip = clientIp(socket, cfg.trustProxy);
    if (!guard.open(ip)) { socket.disconnect(true); return; }
    const conn: Conn = { id: socket.id, send: (event, payload) => { socket.emit(event, payload); } };

    socket.on(CLIENT_EVENT, (raw: unknown, ack?: (a: Ack) => void) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (!guard.allow(ip)) return reply({ ok: false, code: 'rate_limited', message: 'Too many requests from your network. Wait a moment and try again.' });
      const parsed = ClientMessageSchema.safeParse(raw);
      if (!parsed.success) return reply({ ok: false, code: 'bad_message', message: 'That message was not understood.' });
      try {
        reply(hub.handle(conn, parsed.data as ClientMessage));
      } catch (e) {
        app.log.error({ err: e instanceof Error ? e.message : 'unknown' }, 'handler failed'); // never log message contents: they carry tokens
        reply({ ok: false, code: 'server_error', message: 'Something went wrong on the server.' });
      }
    });

    socket.on('disconnect', () => { guard.close(ip); hub.disconnect(conn); });
  });
  return io;
}
