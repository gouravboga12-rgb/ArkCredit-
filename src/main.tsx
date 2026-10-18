import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import './index.css';

async function enableMocking() {
  const enableMocks = (import.meta as any).env?.VITE_ENABLE_MOCKS !== 'false';
  if (!enableMocks || typeof window === 'undefined') {
    return;
  }
  try {
    const { worker } = await import('./mocks/browser');
    // Start worker with race to avoid blocking in headless browser environments
    await Promise.race([
      worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      }),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  } catch (err) {
    console.warn('MSW worker initialization warning:', err);
  }
}

enableMocking().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
});
