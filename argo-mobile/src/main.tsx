import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx';
import { AuthProvider } from './auth/AuthContext';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
} catch (e) {
  console.error("Critical Render Error:", e);
  document.body.innerHTML = `
    <div style="background: #111; color: #ff4747; padding: 20px; font-family: monospace;">
      <h2>Critical App Start Failure</h2>
      <pre>${(e as Error).stack || e}</pre>
    </div>
  `;
}
