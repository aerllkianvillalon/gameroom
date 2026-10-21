/**
 * Fill these in before you launch. They appear in the Privacy Policy, Terms and Cookies pages.
 * Anything still in [square brackets] shows up on the page exactly like that, so it is easy to spot.
 */
export const LEGAL = {
  /** The person or company running the service. */
  operator: 'Elestren Solutions',
  /** Where people can send privacy and legal questions. */
  contactEmail: 'elestrensolutions@gmail.com',
  /** Who hosts the game server and the website (they can see connection logs). */
  hostingProvider: 'Netlify and Render',
  /** Law and courts that apply to the Terms, for example "Singapore". */
  governingLaw: 'the Philippines',
  /** Date these pages were last changed. Update it whenever you edit the text. */
  updated: '21 October 2026',
  /** How long the hosting provider keeps request logs. Check your host's settings. */
  logRetention: '30 days',
} as const;

/** Mirrors the server's room timing in apps/server/src/hosts/types.ts. Update both together. */
export const ROOM_EMPTY_MINUTES = 10;
export const ROOM_MAX_HOURS = 8;