import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeNative } from './lib/native';
import './styles/global.css';
import './styles/browser.css';
import './styles/release.css';
import './styles/settings.css';

initializeNative();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
