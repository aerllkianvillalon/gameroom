import type { Prompt, WyrTopic } from './types';

const p = (topic: WyrTopic, a: string, b: string): Prompt => ({ id: '', topic, a, b });

/** Original, family-friendly prompts. */
const RAW: readonly Prompt[] = [
  p('silly', 'Sing everything you say', 'Dance whenever you hear music'),
  p('silly', 'Fight one horse-sized duck', 'Fight a hundred duck-sized horses'),
  p('silly', 'Eat only pizza for the rest of your life', 'Never eat pizza again'),
  p('silly', 'Have a pet dragon the size of a cat', 'Have a pet cat the size of a dragon'),
  p('silly', 'Talk like a pirate every day', 'Walk like a robot every day'),
  p('silly', 'Talk to animals', 'Speak every human language'),
  p('silly', 'Wear clown shoes everywhere', 'Wear a superhero cape everywhere'),
  p('silly', 'Live in a treehouse', 'Live on a houseboat'),
  p('silly', 'Sneeze glitter', 'Hiccup bubbles'),
  p('silly', 'Have a rewind button for your life', 'Have a pause button for your life'),
  p('silly', 'Be invisible whenever you want', 'Fly whenever you want'),
  p('silly', 'Eat breakfast foods for every meal', 'Eat dinner foods for every meal'),
  p('silly', 'Have a grumpy robot butler', 'Have a pet parrot that repeats all your secrets'),
  p('silly', 'Be able to breathe underwater', 'Be able to run as fast as a car'),
  p('silly', 'Always have to hop instead of walk', 'Always have to whisper instead of talk'),
  p('thoughtful', 'Know exactly how you will die', 'Know exactly when you will die'),
  p('thoughtful', 'Visit the past for a day', 'Visit the future for a day'),
  p('thoughtful', 'Have lots of money but no free time', 'Have enough money and lots of free time'),
  p('thoughtful', 'Be famous for something you did', 'Be unknown but very content'),
  p('thoughtful', 'Never use social media again', 'Never watch videos again'),
  p('thoughtful', 'Live without music', 'Live without movies'),
  p('thoughtful', 'Always tell the truth', 'Always be believed'),
  p('thoughtful', 'Live in a big busy city', 'Live in a small quiet village'),
  p('thoughtful', 'Learn a new skill every month but never master any', 'Master one skill and never learn another'),
  p('thoughtful', 'Talk with your younger self for an hour', 'Talk with your future self for an hour'),
  p('thoughtful', 'Lose all your photos', 'Forget everything about last year'),
  p('thoughtful', 'Give a speech to a thousand people', 'Spend a week alone in a cabin'),
  p('thoughtful', 'Be the smartest person in the room', 'Be the kindest person in the room'),
  p('thoughtful', 'Have a job you love that pays little', 'Have a job you tolerate that pays a lot'),
  p('thoughtful', 'Live where it is always summer', 'Live where it is always autumn'),
];

export const PROMPTS: readonly Prompt[] = RAW.map((r, i) => ({ ...r, id: `w${i}` }));
export const MAX_ROUNDS = 20;
