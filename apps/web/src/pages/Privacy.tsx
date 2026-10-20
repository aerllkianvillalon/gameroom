import { A, Contact, LegalPage, Section, Summary } from '../legal/LegalPage';
import { LEGAL, ROOM_EMPTY_MINUTES, ROOM_MAX_HOURS } from '../legal/config';

export function Privacy() {
  return (
    <LegalPage title="Privacy Policy" intro="GameRoom is a set of party games you can play on one device or online with friends. This page explains what information the service handles and why.">
      <Summary>
        <p className="font-bold">The short version</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>No account, no email address, no password to sign up.</li>
          <li>No ads, no analytics, no tracking, no cookies.</li>
          <li>Playing on one device (pass and play, bots) sends nothing to our server.</li>
          <li>Online rooms send your chosen name, avatar and game moves to the server and to the other players in your room.</li>
          <li>Rooms are kept in server memory only and disappear after at most {ROOM_MAX_HOURS} hours.</li>
        </ul>
      </Summary>

      <Section id="who" title="Who runs GameRoom">
        <p>GameRoom is run by {LEGAL.operator} (&ldquo;we&rdquo;). For any privacy question or request, write to <Contact />.</p>
      </Section>

      <Section id="collect" title="What we handle">
        <p>We only handle what the games need to work.</p>
        <ul>
          <li><strong>Display name and avatar.</strong> You type a name and pick an avatar. In online rooms they are sent to the server and shown to everyone in the room. Please do not use your real full name if you would rather not. In offline play they never leave your device.</li>
          <li><strong>Room information.</strong> The room code, the game, its settings, who is seated, and an optional room password if the host sets one. The password is held in server memory so joiners can be checked against it.</li>
          <li><strong>Game activity.</strong> Cards played, votes, clues, final guesses and similar moves, so the server can run the rules and show each player only what they are allowed to see. Impostor clues and guesses are text that you type.</li>
          <li><strong>Custom word packs.</strong> When an online Impostor game starts, the host&rsquo;s chosen pack (its name and words) is sent to the server for that game. Packs you save for yourself are stored on your device, see <A to="/cookies">Cookies and storage</A>.</li>
          <li><strong>Seat token.</strong> A random secret the server gives your browser so you can rejoin your seat after a reload or dropped connection. It is not linked to who you are.</li>
          <li><strong>IP address and connection details.</strong> Your IP address is used while you are connected to limit how many connections and messages one address can make, which protects the service from abuse. Web server and hosting logs may also record your IP address, the time and the page or endpoint requested. Application error logs do not contain message contents.</li>
        </ul>
        <p>We do not ask for your location, contacts, microphone, camera or payment details, and the app does not use them.</p>
      </Section>

      <Section id="why" title="Why we use it">
        <ul>
          <li>To run the games and show the right information to the right players.</li>
          <li>To let you rejoin a game you were in.</li>
          <li>To keep the service available and fair: rate limits, spotting abuse, fixing faults.</li>
        </ul>
        <p>We do not sell personal information, use it for advertising or build profiles from it.</p>
      </Section>

      <Section id="keep" title="How long it is kept">
        <ul>
          <li><strong>Rooms and game state</strong> live in server memory, not in a database. A room closes when nobody has been connected for {ROOM_EMPTY_MINUTES} minutes, or {ROOM_MAX_HOURS} hours after it was created, whichever is first. A server restart ends every room at once.</li>
          <li><strong>Connection counters</strong> used for rate limits are in memory and removed when you disconnect.</li>
          <li><strong>Hosting and server logs</strong> are kept for the period set by our hosting provider, currently about {LEGAL.logRetention}.</li>
          <li><strong>Data on your own device</strong> stays until you clear it. You can do that any time from the <A to="/cookies">Cookies and storage</A> page.</li>
        </ul>
      </Section>

      <Section id="share" title="Who sees it">
        <ul>
          <li><strong>Other players in your room</strong> see your name, avatar and the public parts of your moves. Anything you type as a clue or guess is visible to them as the game allows. We cannot stop another player from remembering or screenshotting what they see.</li>
          <li><strong>Our hosting provider,</strong> {LEGAL.hostingProvider}, runs the servers for us and can see connection data and logs as part of doing so.</li>
          <li><strong>Authorities,</strong> only if the law requires us to share something we actually hold.</li>
        </ul>
        <p>The app loads its fonts from its own files, not from a third-party font service, and includes no third-party scripts.</p>
      </Section>

      <Section id="transfers" title="Where it is processed">
        <p>Online games are processed on the servers of {LEGAL.hostingProvider}, which may be in a different country from yours. If you play online, your data travels there.</p>
      </Section>

      <Section id="rights" title="Your choices and rights">
        <ul>
          <li><strong>Play without sending anything.</strong> Pass and play and bot games run entirely on your device.</li>
          <li><strong>Leave a room</strong> to remove your seat. Closing the tab keeps your seat for a short while so you can come back.</li>
          <li><strong>Clear what is on your device</strong> from <A to="/cookies">Cookies and storage</A>.</li>
          <li><strong>Ask us.</strong> Depending on where you live, laws such as the Singapore PDPA or the EU and UK GDPR may give you rights to access, correct or delete personal data, or to object to its use. Because rooms are temporary and have no accounts, we usually cannot find data by name, but write to <Contact /> and we will help where we can.</li>
        </ul>
      </Section>

      <Section id="children" title="Children">
        <p>GameRoom is a general-audience party game, not designed for young children. We do not knowingly collect personal information from children under 13. If you are under the age at which you can agree to this yourself where you live, ask a parent or guardian first. A parent who thinks a child has shared information with us can write to <Contact />.</p>
      </Section>

      <Section id="security" title="Security">
        <p>Connections use HTTPS and secure WebSockets. Seat tokens are random, the server checks every message, and rate limits slow down abuse. No online service is perfectly secure, so do not put anything private into names, clues or custom words.</p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>If we change how data is handled we will update this page and its date. The <A to="/terms">Terms</A> and <A to="/community">Community rules</A> explain the other ground rules.</p>
      </Section>

      <Section id="contact" title="Contact">
        <p>{LEGAL.operator}, <Contact /></p>
      </Section>
    </LegalPage>
  );
}
