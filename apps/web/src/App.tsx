import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useApplyPrefs } from './hooks/useApplyPrefs';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { GameDetails } from './pages/GameDetails';
import { CreateRoom } from './pages/CreateRoom';
import { JoinRoom } from './pages/JoinRoom';
import { Lobby } from './pages/Lobby';
import { SettingsPage } from './pages/SettingsPage';
import { Rules } from './pages/Rules';
import { NotFound } from './pages/NotFound';
import { PlayRoute } from './pages/PlayRoute';
import { WordPacks } from './pages/WordPacks';
import { OnlineRoom } from './pages/OnlineRoom';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Cookies } from './pages/Cookies';
import { Community } from './pages/Community';

/** Only routes that lead somewhere real. */
export function App() {
  useApplyPrefs();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="games" element={<Library />} />
        <Route path="games/:id" element={<GameDetails />} />
        <Route path="create" element={<CreateRoom />} />
        <Route path="join" element={<JoinRoom />} />
        <Route path="lobby/:code" element={<Lobby />} />
        <Route path="room/:code" element={<OnlineRoom />} />
        <Route path="play/:code" element={<PlayRoute />} />
        <Route path="packs" element={<WordPacks />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="rules" element={<Rules />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="cookies" element={<Cookies />} />
        <Route path="community" element={<Community />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
