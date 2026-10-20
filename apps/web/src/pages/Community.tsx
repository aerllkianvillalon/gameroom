import { A, Contact, LegalPage, Section } from '../legal/LegalPage';

export function Community() {
  return (
    <LegalPage title="Community rules" intro="GameRoom is for playing with friends, family and the odd stranger with a room code. A few shared rules keep it fun.">
      <Section id="kind" title="Be kind">
        <ul>
          <li>Play to enjoy the game, not to put someone down. Winning is fun. Humiliating someone is not.</li>
          <li>No harassment, threats, slurs or hate. This includes names, avatars, clues and custom words.</li>
          <li>Keep it suitable for the room. Some groups include younger players or colleagues.</li>
        </ul>
      </Section>

      <Section id="fair" title="Play fair">
        <ul>
          <li>Do not share your hidden cards, role or secret word outside the rules of the game, for example in a side chat.</li>
          <li>Do not use scripts, bots or tools to play for you or to read hidden information.</li>
          <li>In ImpostorWho, give clues that fit the game. A clue that gives the word away or is plainly a joke at someone&rsquo;s expense spoils it for everyone.</li>
        </ul>
      </Section>

      <Section id="private" title="Keep private things private">
        <ul>
          <li>Do not put phone numbers, addresses, passwords or other personal details into names, clues, guesses or word packs.</li>
          <li>Do not share other people&rsquo;s details or screenshots of rooms without their consent.</li>
          <li>Room codes work like a doorbell. Only share them with people you want to play with, or set a room password.</li>
        </ul>
      </Section>

      <Section id="host" title="Hosts">
        <p>If you host a room you decide who plays. You can remove players, and you should if someone breaks these rules. Custom word packs are your responsibility, so keep them appropriate for your group.</p>
      </Section>

      <Section id="problems" title="Something wrong?">
        <p>Leave the room, or ask the host to remove the player. To report a problem with the service or with content you saw, write to <Contact /> with the room code and roughly when it happened. We cannot look up a person from a name alone. Breaking these rules can lead to removal from rooms or blocking, as set out in the <A to="/terms">Terms</A>.</p>
      </Section>
    </LegalPage>
  );
}
