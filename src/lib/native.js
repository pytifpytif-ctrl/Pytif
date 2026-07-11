import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

/** True when running inside the Capacitor Android/iOS shell. */
export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function getNativePlatform() {
  return Capacitor.getPlatform()
}

async function syncStatusBar() {
  if (!isNativeApp()) return
  try {
    const dark = document.documentElement.classList.contains('dark')
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: dark ? '#0a0a0a' : '#fcfaf7' })
    }
  } catch {
    /* Status bar API unavailable on this WebView */
  }
}

/** Initialise native shell: splash, status bar, Android back button. */
export async function initNativeApp() {
  if (!isNativeApp()) return

  document.documentElement.classList.add('native-app')

  try {
    await SplashScreen.hide()
  } catch {
    /* ignore */
  }

  await syncStatusBar()

  const observer = new MutationObserver(() => {
    syncStatusBar()
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else App.minimizeApp()
  })
}
