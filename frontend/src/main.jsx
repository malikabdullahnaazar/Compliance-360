import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import './theme.css';
import './index.css';
import App from './App.jsx';
import store from './store/index.js';

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const mode = savedTheme || (prefersDark ? 'dark' : 'light');
document.documentElement.classList.add(mode);
document.documentElement.classList.toggle('dark', mode === 'dark');
document.documentElement.setAttribute('data-theme', mode);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
