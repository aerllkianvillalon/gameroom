import { A, Contact, LegalPage, Section, Summary } from '../legal/LegalPage';
import { LEGAL, ROOM_MAX_HOURS } from '../legal/config';

export function Terms() {
  return (
    <LegalPage title="Terms of Use" intro="These are the rules for using GameRoom. By using the site or joining a room you agree to them.">
      <Summary>
        <p className="font-bold">The short version</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>GameRoom is free, provided as is, and may be down or change at any time.</li>
          <li>Be decent to the other players. See the <A to="/community">Community rules</A>.</li>
          <li>Do not attack, overload or automate the service.</li>
          <li>Rooms are temporary and can vanish. Nothing here is worth money and nothing is guaranteed.</li>
        </ul>
      </Summary>

      <Section id="service" title="The service">
        <p>GameRoom lets you play party games on one device or online in rooms with a code. It is run by {LEGAL.operator} (&ldquo;we&rdquo;). It is free to use and has no accounts, purchases, prizes or gambling.</p>
        <p>Online rooms live in server memory. They end when everyone has left, after {ROOM_MAX_HOURS} hours at most, or when the server restarts or updates. We do not promise that a game can be finished or resumed.</p>
      </Section>

      <Section id="who" title="Who can use it">
        <p>You may use GameRoom if you can form a binding agreement where you live, or if a parent or guardian agrees to these Terms for you. The service is a general-audience game and is not meant for young children. See the <A to="/privacy">Privacy Policy</A> for how information is handled.</p>
      </Section>

      <Section id="content" title="What you put in">
        <p>You choose your name and avatar and may type clues, guesses, room passwords and custom word packs. You are responsible for them. You keep any rights you have in them, and you give us permission to process and show them to the players in your room as needed to run the game. Do not submit anything you do not have the right to share.</p>
      </Section>

      <Section id="use" title="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>harass, threaten, impersonate or abuse other players, or use names, clues or word packs that are hateful, sexual in an unwelcome way, or illegal;</li>
          <li>try to see other players&rsquo; hidden cards, roles or secret words, or otherwise cheat by attacking the service;</li>
          <li>open many connections, send floods of messages, use bots or scripts against the online service, or get around the rate limits;</li>
          <li>probe for weaknesses, break in, or interfere with how the service works for others (to report a security problem, write to <Contact />);</li>
          <li>copy, scrape or republish the service in a way that harms it or misleads people about who runs it;</li>
          <li>use the service for anything unlawful.</li>
        </ul>
        <p>We may remove players or rooms, block addresses, or limit access at any time if we think these rules are being broken or the service is being put at risk.</p>
      </Section>

      <Section id="ip" title="Ownership and trademarks">
        <p>The GameRoom site, design and code belong to {LEGAL.operator} or its licensors and are provided for your personal, non-commercial play. Card and party games listed here follow well-known rules. GameRoom is an independent project. It is not affiliated with, sponsored by or endorsed by the owners of any game name. Game names, including UNO&reg;, may be trademarks of their respective owners and are used only to describe how a game is played.</p>
      </Section>

      <Section id="asis" title="No warranty">
        <p>GameRoom is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We do not promise that it will be uninterrupted, error free or secure, that rules are implemented exactly as a printed game, or that a game will not be interrupted. Some places do not allow certain exclusions, and in those places the exclusions apply only as far as the law permits.</p>
      </Section>

      <Section id="liability" title="Limit of liability">
        <p>To the extent the law allows, we are not liable for indirect or consequential loss, lost games, lost data or lost opportunities arising from your use of GameRoom, or for what other players say or do. Because the service is free, our total liability for any claim relating to it is limited to the greatest amount the law permits for a free service. Nothing in these Terms limits liability that cannot be limited by law, such as for fraud or for death or personal injury caused by negligence.</p>
      </Section>

      <Section id="ending" title="Stopping and changes">
        <p>You can stop using GameRoom at any time. We may change, suspend or end any part of it, and we may update these Terms. The date at the top shows the latest version. If you keep using the service after a change, you accept the new Terms.</p>
      </Section>

      <Section id="law" title="Governing law">
        <p>These Terms are governed by the laws of {LEGAL.governingLaw}, and its courts can hear disputes, unless the law where you live gives you rights that cannot be waived.</p>
      </Section>

      <Section id="contact" title="Contact">
        <p>Questions about these Terms: <Contact />.</p>
      </Section>
    </LegalPage>
  );
}
