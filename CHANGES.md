# Changes in this session

1. UNO is never automatic. Reaching one card opens a race window; the player and everyone else get the same big UNO button; first press wins (owner safe / catcher gives penalty). Bots react after random 0.5-1.6s delays by skill, and bot moves wait 1.8s while the window is open. Removed the "arm UNO" toggle and `callUno` from play actions/protocol.
   Files: packages/uno-engine/src/{rules,types,bot,index}.ts, packages/protocol/src/schemas.ts, apps/server/src/hosts/uno.ts, apps/web/src/games/uno/{UnoBoard,UnoTable,session}.ts(x)
2. Leave button in UNO is now a bordered secondary button with an icon.
3. Mobile tab bar is sticky and rendered after the footer, so it reserves its own space and can never cover/pass the footer (styles/index.css, Layout.tsx).
4. Impostor "Clue rounds" (and all number settings) no longer clamp on every keystroke; typing is free, saved on blur/Enter, with +/- buttons. Max clue rounds raised 4 -> 8 (game-registry/src/games.ts, components/SettingsForm.tsx).

Typecheck clean, 160 tests passing.

## Follow-up
- New red `danger` Button variant, used for every Leave / Close room button (UNO board, Lobby, OnlineRoom, both Impostor screens).
- Mobile tab bar is `position: fixed` again; the Footer now has bottom padding (8rem + safe area, mobile only) so its text is never hidden behind the bar.
