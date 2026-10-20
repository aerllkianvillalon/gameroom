import type { Rng } from '@party/game-engine';
import type { Secret } from './types';

export interface WordGroup { hint: string; words: string[] }
export interface Category { id: string; label: string; groups: WordGroup[] }

const g = (hint: string, words: string): WordGroup => ({ hint, words: words.split(',').map((w) => w.trim()) });

export const CATEGORIES: Category[] = [
  { id: 'objects', label: 'Everyday objects', groups: [
    g('Found in a kitchen', 'spoon, fork, kettle, toaster, blender, teapot'),
    g('Found in a bedroom', 'pillow, blanket, alarm clock, wardrobe, lamp, mattress'),
    g('Found on a desk', 'stapler, keyboard, printer, notebook, calculator, scissors'),
    g('Taken outdoors', 'umbrella, backpack, bicycle, tent, flashlight, sunglasses'),
  ] },
  { id: 'food', label: 'Food', groups: [
    g('A fruit', 'apple, banana, mango, grapes, pineapple, strawberry'),
    g('A snack', 'popcorn, pretzel, chocolate, chips, cookie, donut'),
    g('A meal', 'pizza, burger, sushi, tacos, lasagna, pancakes'),
    g('A drink', 'coffee, lemonade, milkshake, orange juice, tea, smoothie'),
  ] },
  { id: 'animals', label: 'Animals', groups: [
    g('A common pet', 'dog, cat, hamster, goldfish, parrot, rabbit'),
    g('A farm animal', 'cow, pig, chicken, sheep, horse, goat'),
    g('A wild land animal', 'lion, giraffe, elephant, zebra, hippo, cheetah'),
    g('Lives in the sea', 'shark, dolphin, octopus, jellyfish, whale, crab'),
  ] },
  { id: 'places', label: 'Places', groups: [
    g('A building in town', 'school, hospital, library, airport, bakery, cinema'),
    g('A natural place', 'beach, forest, desert, volcano, waterfall, mountain'),
    g('A country to visit', 'France, Japan, Egypt, Brazil, Iceland, Australia'),
    g('A day-out destination', 'zoo, theme park, aquarium, museum, stadium, circus'),
  ] },
  { id: 'movies', label: 'Movies', groups: [
    g('An animated film', 'Shrek, Frozen, Moana, Cars, Up, Coco'),
    g('A science-fiction film', 'Avatar, Inception, Interstellar, Gravity, The Matrix, Alien'),
    g('A film classic', 'Titanic, Jaws, Casablanca, Rocky, Grease, Psycho'),
    g('A superhero film', 'Batman, Spider-Man, Iron Man, Black Panther, Thor, Aquaman'),
  ] },
  { id: 'games', label: 'Games', groups: [
    g('A board game', 'chess, Monopoly, Scrabble, checkers, Risk, Cluedo'),
    g('A video game', 'Minecraft, Tetris, Pac-Man, Fortnite, Zelda, Mario Kart'),
    g('A sport', 'soccer, tennis, basketball, golf, volleyball, swimming'),
    g('A playground game', 'hide and seek, tag, hopscotch, jump rope, marbles, leapfrog'),
  ] },
];

export const getCategory = (id: string): Category | undefined => CATEGORIES.find((c) => c.id === id);

export const RECENT_LIMIT = 40;

/**
 * Picks a word, avoiding anything in `recent` when other words exist.
 * The decoy (used by the "different word" mode) comes from the same group so it feels plausible.
 */
export function pickSecret(groups: readonly WordGroup[], rng: Rng, recent: readonly string[] = []): Secret {
  const recentSet = new Set(recent.map((w) => w.toLowerCase()));
  const all = groups.flatMap((grp) => grp.words.map((word) => ({ word, grp })));
  if (all.length < 2) throw new RangeError('A word pool needs at least 2 words');
  const fresh = all.filter((e) => !recentSet.has(e.word.toLowerCase()));
  const pool = fresh.length > 0 ? fresh : all;
  const pick = rng.pick(pool);
  const sameGroup = pick.grp.words.filter((w) => w.toLowerCase() !== pick.word.toLowerCase());
  const decoyPool = sameGroup.length > 0 ? sameGroup : all.map((e) => e.word).filter((w) => w.toLowerCase() !== pick.word.toLowerCase());
  return { word: pick.word, hint: pick.grp.hint, decoy: rng.pick(decoyPool) };
}

export const pushRecent = (recent: readonly string[], word: string): string[] =>
  [...recent.filter((w) => w.toLowerCase() !== word.toLowerCase()), word].slice(-RECENT_LIMIT);

// ---- custom word packs ----
export interface WordPack { id: string; name: string; words: string[] }
export const PACK_MIN_WORDS = 6;
export const PACK_MAX_WORDS = 200;
export const PACK_MAX_WORD_LENGTH = 30;

/** Splits on new lines and commas, trims, drops blanks, removes case-insensitive duplicates. */
export function parseWords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const w = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim();
    if (w && !seen.has(w.toLowerCase())) { seen.add(w.toLowerCase()); out.push(w); }
  }
  return out;
}

export function validatePack(name: string, words: readonly string[]): string | null {
  if (!name.trim()) return 'Give the pack a name.';
  if (name.trim().length > 30) return 'Pack names can be up to 30 characters.';
  if (words.length < PACK_MIN_WORDS) return `Add at least ${PACK_MIN_WORDS} words (you have ${words.length}).`;
  if (words.length > PACK_MAX_WORDS) return `Packs can hold up to ${PACK_MAX_WORDS} words.`;
  const long = words.find((w) => w.length > PACK_MAX_WORD_LENGTH);
  if (long) return `"${long.slice(0, 20)}..." is longer than ${PACK_MAX_WORD_LENGTH} characters.`;
  return null;
}

export const packToGroups = (pack: WordPack): WordGroup[] => [{ hint: `A word from "${pack.name}"`, words: pack.words }];
