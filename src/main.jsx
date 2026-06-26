import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { BalanceProvider } from './context/BalanceContext.jsx'
import { LiveDataProvider } from './context/LiveDataContext.jsx'
import './index.css'

// Dev: drop any stale service worker (old PWA dev builds logged every Supabase fetch).
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) reg.unregister()
  })
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      /* App shell cached for offline; live data always uses the network. */
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LiveDataProvider>
            <BalanceProvider>
              <App />
            </BalanceProvider>
          </LiveDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
