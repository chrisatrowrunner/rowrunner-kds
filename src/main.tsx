import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker is intentionally NOT registered. The runner app had a painful
// stale-cache bug from its SW, so the KDS ships without one. Proactively clean
// up any worker/cache a previous build (or a sibling app on the same origin)
// installed, so the kiosk always loads fresh code.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
  if ('caches' in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
}
