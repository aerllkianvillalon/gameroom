# GameRoom: pick a game, play with friends

Phase 1 foundation: engine contracts, game registry, room model, offline adapter, design system and routed pages.

## Run
```bash
npm install
npm test          # vitest: engine, registry, offline adapter
npm run typecheck
npm run dev       # http://localhost:5173
```

## Layout
- `packages/game-engine`: `GameEngine` contract, seeded RNG, `Result`, pure room model (codes, membership, start rules)
- `packages/uno-engine`: complete UNO rules as a pure state machine (deck, legal plays, effects, UNO call/catch, house rules, turn clock, bots)
- `packages/impostor-engine`: ImpostorWho rules as a pure state machine (roles, hidden info, clues, votes, ties, multiple impostors, final guess), word pools and custom-pack helpers
- `packages/game-registry`: game metadata, settings schema, status (`playable` | `in-development` | `coming-soon`)
- `apps/web`: React app. Custom word packs live in IndexedDB (`storage/db.ts`); recent words in localStorage. Storage keys start with `gameroom.`; `storage/migrate.ts` copies any old `parlor.*` values over once, and `storage/db.ts` moves word packs from the old `parlor` IndexedDB. `games/uno/` has the local session (bots, turn clock), table UI and pass-and-play handoff. `transport/offline-adapter.ts` runs rooms locally behind the `RoomTransport` interface
- `packages/protocol`: typed client/server messages (`types.ts`) and their zod schemas (`schemas.ts`)
- `apps/server`: Fastify + Socket.IO. `hub.ts` holds every rule (rooms, tokens, per-player views, host handover, away-player autoplay, rate limits, expiry) and knows nothing about sockets; `socket.ts` only validates payloads with zod and calls the hub; `hosts/` run each game's engine

## Run everything locally
```bash
npm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env       # VITE_SERVER_URL=http://localhost:3001
npm run dev -w @party/server                 # terminal 1
npm run dev -w @party/web                    # terminal 2, then open two browser windows
```

## Run the server
```bash
npm install
cp apps/server/.env.example apps/server/.env   # then set ALLOWED_ORIGINS to your frontend's origin
npm run dev -w @party/server                   # http://localhost:3001/health
```
Rooms live in server memory: a restart (or a free host sleeping) ends them. Players who reconnect with their token get their seat and private state back.

## Honest status
- UNO and ImpostorWho are playable offline on one device (bots / pass and play) and online with a room code and seat-token reconnect.
- Added in this pass, **written but not executed** (the build sandbox could not reach the npm registry, so `npm install`, `npm test` and `npm run typecheck` have not been run on it): per-IP connection and message limits (`apps/server/src/ipguard.ts`), recent rooms on the join page, opt-in sound cues, an offline shell (manifest and service worker in `apps/web/public`), a Playwright smoke test (`e2e/`), and `DEPLOY.md`. Only the pure logic of the IP guard was run by hand. Run the three commands above first and fix anything they flag.
- The online flow has never been exercised by a real browser against a real server. `npm run e2e` is the first check.
- Local rooms live in memory and close on reload. Server rooms end on restart.
- Not done: LAN mode (needs a mDNS/host-discovery design), component tests, an installable-app icon set in PNG sizes (only an SVG icon exists), audio for ImpostorWho.

## Design notes
The look is "game night at a card table": deep indigo felt, cream card stock, and the four card colours as the only accents.
- Tokens live in `apps/web/src/styles/index.css` (colours as space-separated RGB so Tailwind alpha works) and `tailwind.config.ts`.
- Display type is Bricolage Grotesque (`@fontsource-variable/bricolage-grotesque`, run `npm install` to pick it up); body is Inter.
- Component classes (`.btn`, `.field`, `.panel`, `.choice`, `.switch`, `.pcard`, `.felt`) sit in `@layer components`, so Tailwind utilities can still override them.
- Phones get a bottom tab bar (`components/TabBar.tsx`) with a "More" sheet; it is hidden at a table (`/play/*`, `/room/*`) so the game owns the screen. The UNO hand is a sticky tray at the bottom.
- Art for each game is built from the game's own pieces in `ui/GameArt.tsx`. The home hero fan is `HeroFan` in `pages/Home.tsx`.
- Motion: one orchestrated moment (headline and card fan on the home page), plus motion that answers a tap (button press, card land, sheet slide). Everything respects the Motion setting and `prefers-reduced-motion`.
