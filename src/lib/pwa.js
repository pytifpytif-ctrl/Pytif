const DISMISS_KEY = 'pytif-pwa-dismissed-until'
const DISMISS_DAYS = 14

export function isStandalonePwa() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  )
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isPwaDismissed() {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return until > Date.now()
  } catch {
    return false
  }
}

export function dismissPwaPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000))
  } catch {
    /* ignore */
  }
}

export function clearPwaDismiss() {
  try {
    localStorage.removeItem(DISMISS_KEY)
  } catch {
    /* ignore */
  }
}
