import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Landing } from './landing';
import './styles.css';
import './app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {document.body.dataset.surface === 'landing' ? <Landing /> : <App />}
  </StrictMode>,
);
