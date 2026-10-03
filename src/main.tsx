import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { App } from './App';
import { MAPS_API_KEY, mapsEnabled } from './lib/maps';
import { supabaseEnabled } from './lib/supabase';
import { SessionProvider, setPendingInvite } from './lib/session';
import './styles.css';

// Remember an invite from a /join/<code> link before sign-in, so it survives the email round trip.
const inviteMatch = window.location.pathname.match(/^\/join\/([\w-]+)\/?$/);
if (supabaseEnabled && inviteMatch) setPendingInvite(inviteMatch[1].toLowerCase());

const app = (
  <BrowserRouter>{supabaseEnabled ? <SessionProvider><App /></SessionProvider> : <App />}</BrowserRouter>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>{mapsEnabled ? <APIProvider apiKey={MAPS_API_KEY}>{app}</APIProvider> : app}</StrictMode>,
);
