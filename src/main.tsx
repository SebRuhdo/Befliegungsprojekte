import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createDemoBackend } from './data/demoBackend';
import type { Backend } from './data/types';
import { firebaseConfigured } from './firebase-config';
import './styles.css';

async function start() {
  const forceDemo = new URLSearchParams(location.search).has('demo');
  let backend: Backend;
  if (firebaseConfigured && !forceDemo) {
    const { createFirebaseBackend } = await import('./data/firebaseBackend');
    backend = createFirebaseBackend();
  } else {
    backend = createDemoBackend();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App backend={backend} />
    </StrictMode>,
  );
}

start();
