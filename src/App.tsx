import { NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { BartenderFormPage } from './pages/BartenderFormPage';
import { BartenderDetailPage } from './pages/BartenderDetailPage';
import { BarsPage } from './pages/BarsPage';
import { BarDetailPage } from './pages/BarDetailPage';
import { MapPage } from './pages/MapPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <div className="app">
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
