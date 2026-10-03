import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { App } from './App';
import { MAPS_API_KEY, mapsEnabled } from './lib/maps';
import './styles.css';

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>{mapsEnabled ? <APIProvider apiKey={MAPS_API_KEY}>{app}</APIProvider> : app}</StrictMode>,
);
