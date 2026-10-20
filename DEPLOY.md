# Deploying GameRoom

Two pieces: a static frontend (`apps/web`) and a Node server (`apps/server`). Rooms live in server memory, so run **one** server instance.

## 1. Server (Render, Fly, Railway or any Node 20+ host)
- Build: `npm install`  Start: `npm run start -w @party/server`
- Environment:
  - `PORT` is set by most hosts.
  - `ALLOWED_ORIGINS` is your frontend origin, for example `https://gameroom.example.app` (comma-separate several; no `*` in production).
  - `TRUST_PROXY=true` on hosts that put a proxy in front (Render, Fly, Railway), so per-IP limits see real client IPs. Leave `false` when the server is exposed directly.
  - `MAX_CONNECTIONS_PER_IP` defaults to 20. Raise it for classrooms or events where many players share one network.
- Health check: `GET /health` returns room and player counts.
- Free tiers sleep when idle and a restart ends every room. Players who reconnect with their seat token get their seat back only while the room still exists.

## 2. Frontend (Netlify, Vercel, Cloudflare Pages, GitHub Pages)
- Build: `npm install && npm run build` ; publish `apps/web/dist`
- Environment at build time: `VITE_SERVER_URL=https://your-server.example.app`
- Single-page app: configure a fallback to `index.html` for unknown paths (Netlify: `/* /index.html 200`).
- Serve over HTTPS: service workers (offline shell) and the websocket both need it.

## 3. Check it works
1. Open the site in two browsers, create a room in one, join with the code in the other.
2. Start a game, reload one tab: it should return to its seat.
3. Turn on airplane mode after one visit: the home page and local (pass-and-play, bots) modes should still load.

## Local end-to-end smoke test
`npm run e2e` (needs `npx playwright install chromium` once) starts the server and the web dev server and plays through create, join and start with two browser contexts.
