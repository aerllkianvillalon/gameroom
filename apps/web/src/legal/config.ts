/**
 * Fill these in before you launch. They appear in the Privacy Policy, Terms and Cookies pages.
 * Anything still in [square brackets] shows up on the page exactly like that, so it is easy to spot.
 */
export const LEGAL = {
  /** The person or company running the service. */
  operator: '[Your name or company]',
  /** Where people can send privacy and legal questions. */
  contactEmail: '[contact@your-domain.example]',
  /** Who hosts the game server and the website (they can see connection logs). */
  hostingProvider: '[Your hosting provider]',
  /** Law and courts that apply to the Terms, for example "Singapore". */
  governingLaw: '[Your country or state]',
  /** Date these pages were last changed. Update it whenever you edit the text. */
  updated: '21 October 2026',
  /** How long the hosting provider keeps request logs. Check your host's settings. */
  logRetention: '[number] days',
} as const;

/** Mirrors the server's room timing in apps/server/src/hosts/types.ts. Update both together. */
export const ROOM_EMPTY_MINUTES = 10;
export const ROOM_MAX_HOURS = 8;
