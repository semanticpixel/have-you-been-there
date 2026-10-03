import { useEffect, useReducer, type ReactNode } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { BartenderFormPage } from './pages/BartenderFormPage';
import { BartenderDetailPage } from './pages/BartenderDetailPage';
import { BarsPage } from './pages/BarsPage';
import { BarDetailPage } from './pages/BarDetailPage';
import { MapPage } from './pages/MapPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignInPage } from './pages/SignInPage';
import { CrewSetupPage } from './pages/CrewSetupPage';
import { getPendingInvite, useSession } from './lib/session';
import { supabaseEnabled } from './lib/supabase';
import { store, useStoreStatus } from './lib/store';

export function App() {
  return supabaseEnabled ? (
    <CrewGate>
      <Shell />
    </CrewGate>
  ) : (
    <Shell />
  );
}

/** With Supabase on: sign in first, then make sure you're in a crew before showing the app. */
function CrewGate({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const invite = getPendingInvite(); // cleared by joinCrew or Cancel

  // main.tsx stashed the invite code from a /join/<code> link; drop the path once auth has read the URL.
  const onJoinPath = location.pathname.startsWith('/join/');
  useEffect(() => {
    if (onJoinPath && state.status !== 'loading') navigate('/', { replace: true });
  }, [onJoinPath, state.status, navigate]);

  if (state.status === 'loading') return <p className="empty">🍸 Pouring…</p>;
  if (state.status === 'signedOut') return <SignInPage />;
  if (!state.active) return <CrewSetupPage />;
  if (invite) return <CrewSetupPage onDone={rerender} />;
  return children;
}

function SyncBanner() {
  const status = useStoreStatus();
  if (status.error)
    return (
      <div className="banner error-banner" role="alert">
        <span>{status.error}</span>
        <button onClick={() => store.refresh()}>Retry</button>
      </div>
    );
  if (status.loading) return <div className="banner">Loading the crew's list…</div>;
  return null;
}

function Shell() {
  const navigate = useNavigate();
  return (
    <div className="app">
      <SyncBanner />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bartenders/new" element={<BartenderFormPage />} />
          <Route path="/bartenders/:id" element={<BartenderDetailPage />} />
          <Route path="/bartenders/:id/edit" element={<BartenderFormPage />} />
          <Route path="/bars" element={<BarsPage />} />
          <Route path="/bars/:key" element={<BarDetailPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {supabaseEnabled && <Route path="/crew/setup" element={<CrewSetupPage onDone={() => navigate('/settings')} />} />}
          <Route path="*" element={<p className="empty">Nothing here. Last call was a while ago.</p>} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end>
          <span>👋</span>People
        </NavLink>
        <NavLink to="/bars">
          <span>🍸</span>Bars
        </NavLink>
        <NavLink to="/bartenders/new" className="add">
          <span>＋</span>Met someone
        </NavLink>
        <NavLink to="/map">
          <span>🗺️</span>Map
        </NavLink>
        <NavLink to="/settings">
          <span>⚙️</span>Crew
        </NavLink>
      </nav>
    </div>
  );
}
