import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { router } from './app/router';
import './index.css';

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '232128680969-40svrvaucn77qbq49oif07iqhvb2ru3e.apps.googleusercontent.com';

async function enableMocking() {
  const enableMocks = (import.meta as any).env?.VITE_ENABLE_MOCKS === 'true';
  if (!enableMocks || typeof window === 'undefined') {
    return;
  }
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  } catch (err) {
    console.warn('MSW worker initialization warning:', err);
  }
}

enableMocking().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <RouterProvider router={router} />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
});
