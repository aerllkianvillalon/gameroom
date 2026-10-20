import { ClearDataButton } from '../ui/ClearDataButton';
import { A, Contact, LegalPage, Section, Summary } from '../legal/LegalPage';

const rows: { name: string; kind: string; what: string; keep: string }[] = [
  { name: 'gameroom.prefs.v1', kind: 'Local storage', what: 'Your default name, avatar, motion, text size, contrast, sound and tutorial choices.', keep: 'Until you clear it' },
  { name: 'gameroom.session.v1', kind: 'Local storage', what: 'Your online room code, player id and seat token, so a reload puts you back in your seat.', keep: 'Removed when you leave the room' },
  { name: 'gameroom.recentRooms.v1', kind: 'Local storage', what: 'Up to five recent room codes and games, shown as shortcuts on the join page.', keep: 'Entries hidden after 24 hours' },
  { name: 'gameroom.recentWords.v1', kind: 'Local storage', what: 'Words used in recent Impostor games, so a rematch does not repeat them.', keep: 'Until you clear it' },
  { name: 'gameroom (wordPacks)', kind: 'IndexedDB', what: 'Custom word packs you saved. They work offline.', keep: 'Until you delete the pack or clear it' },
  { name: 'gameroom-shell-v1', kind: 'Service worker cache', what: 'The app’s own files (page, scripts, fonts, icon), so local games load offline. No personal data.', keep: 'Replaced when the app updates' },
];

export function Cookies() {
  return (
    <LegalPage title="Cookies and local storage" intro="What GameRoom saves in your browser, why, and how to remove it.">
      <Summary>
        <p className="font-bold">The short version</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>GameRoom sets <strong>no cookies</strong>.</li>
          <li>It saves a few things in your browser so the app works: your settings, your seat in a room, and word packs you made.</li>
          <li>Nothing is used for advertising, analytics or tracking, so there is no cookie banner to accept.</li>
        </ul>
      </Summary>

      <Section id="list" title="What is saved on your device">
        <p>This storage is needed to give you the features you ask for. It stays in your browser and is not read by any third party.</p>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">Items GameRoom stores in your browser</caption>
            <thead className="bg-ink-800"><tr><th scope="col" className="p-3">Name</th><th scope="col" className="p-3">Type</th><th scope="col" className="p-3">Purpose</th><th scope="col" className="p-3">Kept</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-line align-top">
                  <th scope="row" className="p-3 font-mono text-xs font-normal">{r.name}</th>
                  <td className="p-3">{r.kind}</td>
                  <td className="p-3">{r.what}</td>
                  <td className="p-3">{r.keep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Old data from when the app was called Parlor (keys starting <span className="font-mono text-sm">parlor.</span>) is moved across once and then deleted.</p>
      </Section>

      <Section id="why-no-banner" title="Why there is no cookie banner">
        <p>Consent banners are for cookies and similar storage used for tracking or marketing. GameRoom has none of that. What it saves is essential to features you use, such as remembering your seat or your word packs. If we ever add anything that needs your consent, we will ask first and update this page.</p>
      </Section>

      <Section id="third" title="Third parties">
        <p>The web app loads no third-party scripts, trackers or fonts. Online play connects to the GameRoom game server, which receives the data described in the <A to="/privacy">Privacy Policy</A>.</p>
      </Section>

      <Section id="manage" title="Remove it">
        <p>Use the button to remove everything GameRoom has saved in this browser. You can also clear site data in your browser&rsquo;s settings, or use a private window, which forgets it all when you close it. Without saved data, GameRoom still works but will not remember you.</p>
        <ClearDataButton />
      </Section>

      <Section id="contact" title="Questions">
        <p><Contact /></p>
      </Section>
    </LegalPage>
  );
}
